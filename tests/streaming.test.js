"use strict";

/*
 * Streaming answers, answer cache, line-break cleaning,
 * visitor-disconnect abort and stalled-model timeout,
 * using a fake Ollama server.
 */

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const workDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "iim-stream-"));
const ADMIN_PASSWORD = "stream-admin-password";

const RENEW = "How do I renew my CDPO?";
const SLOW = "What is the CDPO exam like?";
const STALL = "What does the CDPO certification cover?";

/* ---------- Fake Ollama ---------- */

const fake = {
  completions: 0,
  closedEarly: 0,
};

function questionOf(body) {
  const last = body.messages[body.messages.length - 1].content;
  const match = last.match(/CURRENT USER QUESTION:\n([\s\S]*?)\n\n/);
  return match ? match[1] : "";
}

const MODEL_ANSWER_PARTS = [
  "To renew your CDPO:\n\n",
  "- Complete 20 CPD points (SOURCE 1)\n",
  "- Apply   30 days before expiry\n\n\n\nContact certification@iim-africa.org.",
];

function startFakeOllama() {
  const server = http.createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => { raw += chunk; });
    request.on("end", async () => {
      if (request.url === "/api/tags") {
        response.end(JSON.stringify({ models: [{ name: "llama3.2:3b" }] }));
        return;
      }

      if (request.url === "/api/generate") {
        response.end("{}");
        return;
      }

      const body = JSON.parse(raw);
      const question = questionOf(body);
      fake.completions += 1;

      if (!body.stream) {
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({
          choices: [{ message: { content: MODEL_ANSWER_PARTS.join("") } }],
        }));
        return;
      }

      response.setHeader("Content-Type", "text/event-stream");
      const send = (text) =>
        response.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);

      if (question === STALL) {
        send("Starting an answer");
        /* Then go silent: the server's idle timeout must fire. */
        return;
      }

      if (question === SLOW) {
        let closed = false;
        response.on("close", () => {
          if (!response.writableEnded) {
            closed = true;
            fake.closedEarly += 1;
          }
        });

        for (let i = 0; i < 40 && !closed; i += 1) {
          send(`word${i} `);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (!closed) {
          response.end("data: [DONE]\n\n");
        }
        return;
      }

      for (const part of MODEL_ANSWER_PARTS) {
        send(part);
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
      response.end("data: [DONE]\n\n");
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

/* ---------- Client helpers ---------- */

async function readEvents(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffered += decoder.decode(value, { stream: true });

    let boundary;
    while ((boundary = buffered.indexOf("\n\n")) !== -1) {
      const block = buffered.slice(0, boundary);
      buffered = buffered.slice(boundary + 2);
      const event = (block.match(/^event: (.*)$/m) || [])[1];
      const data = (block.match(/^data: (.*)$/m) || [])[1];
      if (event && data && onEvent(event, JSON.parse(data)) === false) {
        await reader.cancel();
        return;
      }
    }
  }
}

async function main() {
  const ollama = await startFakeOllama();

  process.env.OLLAMA_BASE_URL = `http://127.0.0.1:${ollama.address().port}`;
  process.env.KNOWLEDGE_DATA_PATH = path.join(workDirectory, "knowledge-base.json");
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
  process.env.CHAT_RATE_LIMIT_PER_MINUTE = "0";
  process.env.REQUEST_TIMEOUT_MS = "1500";

  const { startServer, cleanModelAnswer } = require("../server");

  /* ---------- Acronym guard ---------- */
  const acronymCases = [
    ["Renew your CDPO (Child Development and Protection Officer) now",
      "Renew your CDPO (Certified Data Protection Officer) now"],
    ["The Child Development and Protection Officer (CDPO) exam",
      "The Certified Data Protection Officer (CDPO) exam"],
    ["Earn CPD (Continuous Professional Development) points",
      "Earn CPD (Continuing Professional Development) points"],
    ["IIM (Institute for Information Management) offers",
      "IIM (Institute of Information Management) offers"],
    ["CDPO (Certified Data Protection Officer) is valid",
      "CDPO (Certified Data Protection Officer) is valid"],
    ["Contact IIM (Nigeria) for details", "Contact IIM (Nigeria) for details"],
    ["The CDPO (exam) is online", "The CDPO (exam) is online"],
  ];

  for (const [input, expected] of acronymCases) {
    assert.equal(cleanModelAnswer(input), expected);
  }

  /* ---------- Source citations removed cleanly ---------- */
  for (const [input, expected] of [
    ["However, according to SOURCE 2, members are expected to declare CPD.",
      "However, members are expected to declare CPD."],
    ["According to SOURCE 1, the fee is USD 50.", "The fee is USD 50."],
    ["According to Title: Nigeria Membership Categories and Grades, there is no fee listed.",
      "There is no fee listed."],
    ["- According to SOURCE 4, apply 30 days before expiry.", "- Apply 30 days before expiry."],
    ["Fees are set according to the grade you choose.", "Fees are set according to the grade you choose."],
    ["Based on your experience, the Associate grade may suit you.",
      "Based on your experience, the Associate grade may suit you."],
  ]) {
    assert.equal(cleanModelAnswer(input), expected);
  }

  const server = startServer(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const chat = (message, extra = {}) =>
    fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, ...extra }),
    });

  try {
    /* ---------- Streaming ---------- */
    const streamed = await chat(RENEW, { stream: true });
    assert.equal(streamed.status, 200);
    assert.match(streamed.headers.get("content-type"), /text\/event-stream/);
    assert.equal(streamed.headers.get("x-accel-buffering"), "no");

    const tokens = [];
    let done = null;
    await readEvents(streamed, (event, data) => {
      if (event === "token") tokens.push(data.text);
      if (event === "done") done = data;
    });

    assert.equal(tokens.length, 3, "each model piece is forwarded");
    assert.equal(tokens.join(""), MODEL_ANSWER_PARTS.join(""));
    assert(done, "final event received");
    assert.equal(done.meta.provider, "ollama");
    assert.equal(done.meta.cached, false);
    assert.match(done.responseId, /^[0-9a-f-]{36}$/, "rating ID on streamed answers");
    assert(done.sources.length > 0);

    /* Line breaks kept, SOURCE markers and extra spaces removed. */
    assert.equal(
      done.answer,
      "To renew your CDPO:\n\n- Complete 20 CPD points\n- Apply 30 days before expiry\n\nContact certification@iim-africa.org."
    );

    /* ---------- Cache ---------- */
    const callsBefore = fake.completions;
    const repeat = await (await chat(RENEW)).json();
    assert.equal(repeat.meta.cached, true, "repeat first question served from cache");
    assert.equal(repeat.answer, done.answer);
    assert.equal(fake.completions, callsBefore, "model not called again");

    const cachedStream = await chat(RENEW, { stream: true });
    let cachedDone = null;
    let cachedTokens = 0;
    await readEvents(cachedStream, (event, data) => {
      if (event === "token") cachedTokens += 1;
      if (event === "done") cachedDone = data;
    });
    assert.equal(cachedTokens, 0, "cached answers arrive in one piece");
    assert.equal(cachedDone.meta.cached, true);

    const followUp = await (await chat(RENEW, {
      history: [
        { role: "user", content: "Tell me about CDPO" },
        { role: "assistant", content: "CDPO is IIM's data protection certification." },
      ],
    })).json();
    assert.equal(followUp.meta.cached, false, "follow-ups depend on history; never cached");
    assert.equal(fake.completions, callsBefore + 1);

    /* Admin edit clears the cache. */
    const headers = {
      "Content-Type": "application/json",
      "X-Admin-Password": ADMIN_PASSWORD,
    };
    const { documents } = await (await fetch(`${base}/api/admin/documents`, { headers })).json();
    const document = documents[0];
    const save = await fetch(`${base}/api/admin/documents/${document.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ ...document, text: `${document.text} Updated.` }),
    });
    assert.equal(save.status, 200);

    const afterEdit = await (await chat(RENEW)).json();
    assert.equal(afterEdit.meta.cached, false, "cache cleared after knowledge edit");

    /* ---------- Visitor disconnects ---------- */
    const slow = await chat(SLOW, { stream: true });
    let slowTokens = 0;
    await readEvents(slow, (event) => {
      if (event === "token") slowTokens += 1;
      return slowTokens < 3;
    });
    await new Promise((resolve) => setTimeout(resolve, 600));
    assert.equal(fake.closedEarly, 1, "model request aborted when the visitor leaves");

    /* ---------- Stalled model ---------- */
    const stalled = await chat(STALL, { stream: true });
    let stalledDone = null;
    await readEvents(stalled, (event, data) => {
      if (event === "done") stalledDone = data;
    });
    assert(stalledDone, "visitor still gets an answer");
    assert.equal(stalledDone.meta.fallbackReason, "ollama_unavailable");
    assert.equal(stalledDone.meta.provider, "rule-based-engine");

    /* ---------- Errors keep their status when streaming ---------- */
    const empty = await chat("", { stream: true });
    assert.equal(empty.status, 400);
    assert.match(empty.headers.get("content-type"), /application\/json/);

    console.log("Streaming and cache tests passed.");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    server.closeAllConnections();
    ollama.closeAllConnections();
    await new Promise((resolve) => ollama.close(resolve));
    fs.rmSync(workDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
