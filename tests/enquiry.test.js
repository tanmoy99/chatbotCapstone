"use strict";

/*
 * Enquiry form: validation, storage, email, admin tracking,
 * spam trap and rate limit.
 */

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const express = require("express");
const nodemailer = require("nodemailer");

const registerEnquiryApi = require("../enquiry-api");
const { validateEnquiry } = registerEnquiryApi;

const workDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "iim-enquiry-"));
const ADMIN_PASSWORD = "enquiry-admin-password";

const valid = {
  name: "Ada Obi",
  email: "ada@example.com",
  phone: "+234 803 123 4567",
  preferredContact: "whatsapp",
  message: "How do I renew my CDPO certification this year?",
  consent: true,
};

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function post(base, body, headers = {}) {
  return fetch(`${base}/api/enquiry`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function testValidation() {
  assert.doesNotThrow(() => validateEnquiry(valid));

  const rejects = (changes, pattern) =>
    assert.throws(() => validateEnquiry({ ...valid, ...changes }), pattern);

  rejects({ name: " " }, /name/);
  rejects({ email: "not-an-email" }, /valid email/);
  rejects({ phone: "12" }, /valid phone/);
  rejects({ phone: "call me maybe" }, /valid phone/);
  rejects({ email: "", phone: "" }, /email address or a phone/);
  rejects({ preferredContact: "pigeon" }, /how you'd like/);
  rejects({ preferredContact: "email", email: "" }, /email address/);
  rejects({ preferredContact: "phone", phone: "" }, /phone number/);
  rejects({ message: "hi" }, /more detail/);
  rejects({ consent: false }, /confirm/);
  rejects({ consent: "true" }, /confirm/);

  const cleaned = validateEnquiry({ ...valid, name: "Ada\r\nBcc: evil@example.com" });
  assert(!/[\r\n]/.test(cleaned.name), "line breaks removed from single-line fields");
}

async function testWithMailer() {
  const sent = [];
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const mailer = {
    async sendMail(message) {
      const info = await transport.sendMail(message);
      sent.push({ message, raw: info.message.toString() });
      return info;
    },
  };

  const enquiryPath = path.join(workDirectory, "with-mailer", "enquiries.jsonl");
  const app = express();
  app.use(express.json());
  const requireAdmin = (request, response, next) =>
    request.get("x-admin-password") === ADMIN_PASSWORD
      ? next()
      : response.status(401).json({ error: "no" });

  process.env.SMTP_USER = "assistant@myiim.network";
  registerEnquiryApi(app, {
    enquiryPath,
    requireAdmin,
    mailer,
    getDefaultRecipient: () => "info@iim-africa.org",
  });

  const server = await listen(app);
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    /* Header-injection attempt in the name is neutralised. */
    const response = await post(base, { ...valid, name: "Ada\r\nBcc: evil@example.com" });
    const result = await response.json();
    assert.equal(response.status, 201, JSON.stringify(result));
    assert.match(result.reference, /^IIM-[A-Z2-9]{6}$/);
    assert.equal(result.emailed, true);

    assert.equal(sent.length, 1);
    const { message, raw } = sent[0];
    assert.equal(message.to, "info@iim-africa.org");
    assert.equal(message.from, "assistant@myiim.network");
    assert.equal(message.replyTo, "ada@example.com", "IIM can reply straight to the visitor");
    assert(message.subject.includes(result.reference));
    assert(message.text.includes(valid.message));
    assert(message.text.includes("Preferred reply: WhatsApp"));
    assert(!/^bcc:/im.test(raw), "no injected Bcc header");

    const stored = fs.readFileSync(enquiryPath, "utf8").trim().split("\n").map(JSON.parse);
    assert.equal(stored.length, 1);
    assert.equal(stored[0].emailStatus, "sent");
    assert.equal(stored[0].status, "new");

    /* Admin list and status changes. */
    assert.equal((await fetch(`${base}/api/admin/enquiries`)).status, 401);

    const admin = (url, options = {}) =>
      fetch(`${base}${url}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": ADMIN_PASSWORD,
        },
      });

    const listed = await (await admin("/api/admin/enquiries")).json();
    assert.equal(listed.emailConfigured, true);
    assert.equal(listed.summary.new, 1);

    const id = listed.entries[0].id;
    assert.equal(
      (await admin(`/api/admin/enquiries/${id}`, { method: "PATCH", body: JSON.stringify({ status: "done" }) })).status,
      400
    );
    assert.equal(
      (await admin("/api/admin/enquiries/missing", { method: "PATCH", body: JSON.stringify({ status: "closed" }) })).status,
      404
    );
    assert.equal(
      (await admin(`/api/admin/enquiries/${id}`, { method: "PATCH", body: JSON.stringify({ status: "in_progress" }) })).status,
      200
    );

    const after = await (await admin("/api/admin/enquiries")).json();
    assert.deepEqual(after.summary, { total: 1, new: 0, inProgress: 1, closed: 0 });
  } finally {
    await close(server);
    delete process.env.SMTP_USER;
  }
}

async function testFailingMailerStillSaves() {
  const enquiryPath = path.join(workDirectory, "failing", "enquiries.jsonl");
  const app = express();
  app.use(express.json());
  registerEnquiryApi(app, {
    enquiryPath,
    requireAdmin: (request, response, next) => next(),
    mailer: {
      async sendMail() {
        throw new Error("SMTP connection refused");
      },
    },
  });

  const server = await listen(app);
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const response = await post(base, valid);
    const result = await response.json();
    assert.equal(response.status, 201, "visitor's enquiry is still accepted");
    assert.equal(result.emailed, false);

    const stored = JSON.parse(fs.readFileSync(enquiryPath, "utf8").trim());
    assert.equal(stored.emailStatus, "failed", "staff can see the email failed");
  } finally {
    await close(server);
  }
}

async function closedPortUrl() {
  const probe = http.createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${probe.address().port}`;
  await new Promise((resolve) => probe.close(resolve));
  return url;
}

async function testMainServer() {
  process.env.OLLAMA_BASE_URL = await closedPortUrl();
  process.env.KNOWLEDGE_DATA_PATH = path.join(workDirectory, "server", "knowledge-base.json");
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
  process.env.TRUST_PROXY = "1";
  process.env.ENQUIRY_LIMIT_PER_10_MINUTES = "3";
  for (const name of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]) {
    process.env[name] = "";
  }

  const { startServer } = require("../server");
  const server = startServer(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const enquiryPath = path.join(workDirectory, "server", "enquiries.jsonl");
  const visitor = { "X-Forwarded-For": "203.0.113.50" };

  try {
    /* Bots filling the hidden field get a normal-looking reply but nothing is saved. */
    const trapped = await post(base, { ...valid, website: "http://spam.example" }, visitor);
    assert.equal(trapped.status, 201);
    assert(!fs.existsSync(enquiryPath), "spam not stored");

    const invalid = await post(base, { ...valid, consent: false }, visitor);
    assert.equal(invalid.status, 400);
    assert.match((await invalid.json()).error, /confirm/);

    const accepted = await post(base, valid, visitor);
    const result = await accepted.json();
    assert.equal(accepted.status, 201);
    assert.equal(result.emailed, false, "no SMTP configured");

    const stored = JSON.parse(fs.readFileSync(enquiryPath, "utf8").trim());
    assert.equal(stored.emailStatus, "not_configured");
    assert.equal(stored.reference, result.reference);

    const listed = await (await fetch(`${base}/api/admin/enquiries`, {
      headers: { "X-Admin-Password": ADMIN_PASSWORD, ...visitor },
    })).json();
    assert.equal(listed.emailConfigured, false);
    assert.equal(listed.summary.total, 1);

    /* Limit of 3 per 10 minutes per visitor; the trap and invalid attempts count too. */
    assert.equal((await post(base, valid, visitor)).status, 429);
    assert.equal(
      (await post(base, valid, { "X-Forwarded-For": "203.0.113.51" })).status,
      201,
      "other visitors unaffected"
    );
  } finally {
    await close(server);
  }
}

async function main() {
  try {
    testValidation();
    await testWithMailer();
    await testFailingMailerStillSaves();
    await testMainServer();
    console.log("Enquiry tests passed.");
  } finally {
    fs.rmSync(workDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
