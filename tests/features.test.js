"use strict";

/*
 * Checks the visitor-facing features:
 * - server-side answer feedback (rating by response ID only)
 * - personal details removed from stored questions
 * - admin feedback list and CSV export
 * - "contact a human" handoff details on chat answers
 * - embed.js headers and frame-ancestors for allowed sites
 * - privacy note on the chat page
 */

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const workDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "iim-features-"));
const ADMIN_PASSWORD = "features-admin-password";

async function closedPortUrl() {
  const probe = http.createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${probe.address().port}`;
  await new Promise((resolve) => probe.close(resolve));
  return url;
}

async function main() {
  process.env.OLLAMA_BASE_URL = await closedPortUrl();
  process.env.KNOWLEDGE_DATA_PATH = path.join(workDirectory, "knowledge-base.json");
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
  process.env.CHAT_RATE_LIMIT_PER_MINUTE = "0";
  process.env.HANDOFF_WHATSAPP = "+234 800 000 0000";
  process.env.EMBED_ALLOWED_ORIGINS = "https://iim-africa.org https://www.iim-africa.org/";

  const { redactPersonalDetails } = require("../feedback-api");
  const { startServer } = require("../server");
  const server = startServer(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const feedbackPath = path.join(workDirectory, "feedback.jsonl");

  const chat = async (message) => {
    const response = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    assert.equal(response.status, 200);
    return response.json();
  };

  const rate = (responseId, rating, extra = {}) =>
    fetch(`${base}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responseId, rating, ...extra }),
    });

  const admin = (url) =>
    fetch(`${base}${url}`, { headers: { "X-Admin-Password": ADMIN_PASSWORD } });

  try {
    /* ---------- Redaction ---------- */
    assert.equal(
      redactPersonalDetails("Mail jane.doe@example.com, card 4111 1111 1111 1111, call +234 803 123 4567"),
      "Mail [email removed], card [number removed], call [number removed]"
    );
    assert.equal(redactPersonalDetails("CDPO fees for 2026"), "CDPO fees for 2026");

    /* ---------- Feedback ---------- */
    const answered = await chat("What is the mission of IIM? My email is visitor@example.com");
    assert.match(answered.responseId, /^[0-9a-f-]{36}$/);

    assert.equal((await rate(answered.responseId, "sideways")).status, 400);
    assert.equal((await rate("not-a-real-id", "up")).status, 404);
    assert.equal((await rate(answered.responseId, "down", { embedded: true })).status, 201);
    assert.equal((await rate(answered.responseId, "up")).status, 409, "one rating per answer");

    const second = await chat("Membership fees");
    assert.equal((await rate(second.responseId, "up")).status, 201);

    const lines = fs.readFileSync(feedbackPath, "utf8").trim().split("\n").map(JSON.parse);
    assert.equal(lines.length, 2);
    assert.equal(lines[0].rating, "down");
    assert.equal(lines[0].embedded, true);
    assert.equal(lines[0].answer, answered.answer, "stored answer is what the server sent");
    assert(lines[0].question.includes("[email removed]"));
    assert(!lines[0].question.includes("visitor@example.com"));

    /* Admin endpoints require the password. */
    assert.equal((await fetch(`${base}/api/admin/feedback`)).status, 401);

    const listed = await (await admin("/api/admin/feedback")).json();
    assert.deepEqual(listed.summary, { total: 2, up: 1, down: 1 });
    assert.equal(listed.entries[0].rating, "up", "newest first");

    const csvResponse = await admin("/api/admin/feedback.csv");
    assert.equal(csvResponse.status, 200);
    assert.match(csvResponse.headers.get("content-type"), /text\/csv/);
    const csv = await csvResponse.text();
    assert(csv.includes('"down"') && csv.includes('"up"'));
    assert.equal(csv.trim().split("\r\n").length, 3, "header plus two rows");

    /* ---------- Human handoff ---------- */
    const human = await chat("Can I talk to a human?");
    assert(human.meta.handoff, "handoff offered when a person is requested");
    assert.equal(human.meta.handoff.reason, "requested");
    assert.equal(human.meta.handoff.email, "info@iim-africa.org");
    assert.equal(human.meta.handoff.whatsapp, "2348000000000");

    const unknown = await chat("What is the weather in Paris tomorrow?");
    assert.equal(unknown.meta.fallbackReason, "no_reliable_knowledge");
    assert.equal(unknown.meta.handoff.reason, "unanswered");

    assert.equal(answered.meta.handoff, undefined, "no handoff on a normal answer");
    assert.equal(answered.meta.error, undefined, "no internal error text in answers");

    /* ---------- Embedding ---------- */
    const page = await fetch(`${base}/?embed=1`);
    const csp = page.headers.get("content-security-policy");
    assert.match(csp, /frame-ancestors 'self' https:\/\/iim-africa\.org https:\/\/www\.iim-africa\.org/);
    assert.equal(page.headers.get("x-frame-options"), null);

    const html = await page.text();
    assert(html.includes('id="privacy-note"'), "privacy note on chat page");
    assert(html.includes("embed-mode.js"), "embed mode script loaded");

    const embed = await fetch(`${base}/embed.js`);
    assert.equal(embed.status, 200);
    assert.equal(embed.headers.get("cross-origin-resource-policy"), "cross-origin");
    assert.match(embed.headers.get("content-type"), /javascript/);

    const other = await fetch(`${base}/styles.css`);
    assert.equal(other.headers.get("cross-origin-resource-policy"), "same-origin");

    console.log("Feature tests passed.");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(workDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
