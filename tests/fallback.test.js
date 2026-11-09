"use strict";

const assert = require("assert");
const http = require("http");

async function main() {
  // Reserve a port, then close it to exercise a real unavailable Ollama service.
  const unavailable = http.createServer();
  await new Promise((resolve) => unavailable.listen(0, "127.0.0.1", resolve));
  process.env.OLLAMA_BASE_URL = `http://127.0.0.1:${unavailable.address().port}`;
  await new Promise((resolve) => unavailable.close(resolve));
  const { startServer } = require("../server");
  const server = startServer(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await (await fetch(`${base}/api/health`)).json();
    assert.equal(health.status, "degraded");
    assert.equal(health.ollama.connected, false);
    const response = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "What is the mission of IIM?" }),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.meta.provider, "rule-based-engine");
    assert.equal(result.meta.fallbackReason, "ollama_unavailable");
    const mission = global.IIM_KB.knowledge.find((document) => document.id === "about_iim_mission_vision");
    assert(result.answer.includes(mission.text));
    assert(result.sources.includes(mission.title));
    assert(result.quickReplies.length > 0);

    const browserFallback = global.IIM_Engine.respond("Membership fees");
    assert(browserFallback.text.includes(global.IIM_KB.knowledge.find(
      (document) => document.id === "ng_membership_fees"
    ).text));
    const cdpoQuery = "I'm a data protection officer. Which certification fits me?";
    const chunks = ["cdpo_overview", "privacy_summary"].map((id) => global.IIM_KB.ragCorpus.find((item) => item.id === id));
    for (const answer of [global.IIM_Engine.respond(cdpoQuery, chunks), global.IIM_Engine.respond(cdpoQuery)]) {
      assert(/CDPO/.test(answer.text));
      assert(!/biometric|marketing|privacy policy/i.test(answer.text));
      assert.equal(answer.sources.length, 1);
    }
    assert(global.IIM_Engine.respond("Membership").sources.includes("Nigeria Membership Categories and Grades"));
    assert(global.IIM_Engine.respond("Membership benefits").sources.includes("Membership Benefits"));
    const unknown = global.IIM_Engine.respond("zzzzzz");
    assert.equal(unknown.intentId, "fallback");
    assert.equal(unknown.sources.length, 0);
    assert(unknown.text.length > 0);
    // Deactivated documents must not leak through an intent's source mapping.
    const document = global.IIM_KB.knowledge.find((item) => item.id === "ng_membership_fees");
    const active = document.active;
    try {
      document.active = false;
      assert(!global.IIM_Engine.respond("Membership fees").sources.includes(document.title));
    } finally {
      document.active = active;
    }
    console.log("Ollama outage and browser rule-based fallback tests passed.");
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
