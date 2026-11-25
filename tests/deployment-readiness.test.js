"use strict";

/*
 * Checks the production-readiness behaviour:
 * - admin saves go live without a restart
 * - a rejected reload restores the previous file
 * - the live knowledge file can live outside the repo
 * - chat rate limiting is per visitor behind a proxy
 * - admin lockout is per visitor behind a proxy
 * - /api/health does not expose internal details
 */

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const express = require("express");

const projectRoot = path.join(__dirname, "..");
const seedPath = path.join(projectRoot, "data", "knowledge-base.json");
const seedBefore = fs.readFileSync(seedPath, "utf8");

const workDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "iim-kb-"));
const livePath = path.join(workDirectory, "live", "knowledge-base.json");
const ADMIN_PASSWORD = "test-admin-password";

async function closedPortUrl() {
  const probe = http.createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${probe.address().port}`;
  await new Promise((resolve) => probe.close(resolve));
  return url;
}

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function testMainServer() {
  process.env.OLLAMA_BASE_URL = await closedPortUrl();
  process.env.KNOWLEDGE_DATA_PATH = livePath;
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
  process.env.TRUST_PROXY = "1";
  process.env.CHAT_RATE_LIMIT_PER_MINUTE = "3";
  process.env.HOST = "127.0.0.1";

  const { startServer } = require("../server");
  const server = startServer(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    /* HOST=127.0.0.1 keeps the app off public interfaces. */
    assert.equal(server.address().address, "127.0.0.1");

    /* Live file seeded outside the repository. */
    assert(fs.existsSync(livePath), "live knowledge file should be seeded");
    assert.equal(fs.readFileSync(livePath, "utf8"), seedBefore);

    /* Health endpoint keeps what the UI needs and nothing internal. */
    const health = await (await fetch(`${base}/api/health`)).json();
    assert.equal(health.ollama.connected, false);
    assert.equal(typeof health.knowledgeBase.documents, "number");
    assert.equal(health.ollama.baseUrl, undefined);
    assert.equal(health.ollama.installedModels, undefined);
    assert.equal(health.ollama.error, undefined);
    assert.equal(health.knowledgeBase.source, undefined);

    /* Chat rate limit is per visitor, using X-Forwarded-For. */
    const chat = (ip) => fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
      body: JSON.stringify({ message: "What is the mission of IIM?" }),
    });

    for (let i = 0; i < 3; i += 1) {
      assert.equal((await chat("203.0.113.1")).status, 200);
    }
    const limited = await chat("203.0.113.1");
    assert.equal(limited.status, 429);
    assert(Number(limited.headers.get("retry-after")) > 0);
    assert.equal((await chat("203.0.113.2")).status, 200, "other visitors unaffected");

    /* Admin lockout is per visitor, not shared through the proxy. */
    const login = (ip, password) => fetch(`${base}/api/admin/login`, {
      method: "POST",
      headers: { "X-Forwarded-For": ip, "X-Admin-Password": password },
    });

    for (let i = 0; i < 5; i += 1) {
      assert.equal((await login("198.51.100.9", "wrong")).status, 401);
    }
    assert.equal((await login("198.51.100.9", ADMIN_PASSWORD)).status, 429);
    assert.equal((await login("198.51.100.10", ADMIN_PASSWORD)).status, 200);

    /* Admin save goes live without a restart. */
    const adminHeaders = {
      "Content-Type": "application/json",
      "X-Forwarded-For": "198.51.100.10",
      "X-Admin-Password": ADMIN_PASSWORD,
    };
    const { documents } = await (await fetch(`${base}/api/admin/documents`, {
      headers: adminHeaders,
    })).json();
    const original = documents.find((item) => item.id === "about_iim_mission_vision");
    assert(original, "mission document should exist");

    const marker = `Live reload marker ${Date.now()}.`;
    const saveResponse = await fetch(
      `${base}/api/admin/documents/${original.id}`,
      {
        method: "PUT",
        headers: adminHeaders,
        body: JSON.stringify({ ...original, text: `${original.text} ${marker}` }),
      }
    );
    const saved = await saveResponse.json();
    assert.equal(saveResponse.status, 200, JSON.stringify(saved));
    assert.equal(saved.restartRequired, false);

    const active = global.IIM_KB.knowledge.find((item) => item.id === original.id);
    assert(active.text.includes(marker), "in-memory knowledge should be updated");
    assert(
      global.IIM_KB.ragCorpus.find((item) => item.id === original.id).text.includes(marker),
      "RAG corpus should be updated"
    );
    const browserData = await (await fetch(`${base}/knowledge-data.js`)).text();
    assert(browserData.includes(marker), "browser knowledge should be updated");

    /* Backups sit beside the live file; the repo seed is untouched. */
    assert(fs.readdirSync(path.join(path.dirname(livePath), "backups")).length > 0);
    assert.equal(fs.readFileSync(seedPath, "utf8"), seedBefore);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function testRejectedReloadRollsBack() {
  const knowledgePath = path.join(workDirectory, "rollback", "knowledge-base.json");
  fs.mkdirSync(path.dirname(knowledgePath), { recursive: true });
  fs.writeFileSync(knowledgePath, seedBefore);

  const app = express();
  app.use(express.json());
  require("../admin-api")(app, {
    knowledgePath,
    onKnowledgeChange() {
      throw new Error("simulated invalid knowledge");
    },
  });
  const server = await listen(app);
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const original = JSON.parse(seedBefore).documents[0];
    const response = await fetch(`${base}/api/admin/documents/${original.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Password": ADMIN_PASSWORD,
      },
      body: JSON.stringify({ ...original, text: "Rejected change" }),
    });
    const result = await response.json();
    assert.equal(response.status, 400);
    assert(result.error.includes("simulated invalid knowledge"));
    assert.equal(fs.readFileSync(knowledgePath, "utf8"), seedBefore, "file restored");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function main() {
  try {
    await testMainServer();
    await testRejectedReloadRollsBack();
    console.log("Deployment readiness tests passed.");
  } finally {
    fs.rmSync(workDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
