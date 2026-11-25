"use strict";

/*
 * Visitor enquiries ("send IIM a message" form).
 *
 * Every enquiry is saved first, so none is lost, and then emailed
 * to IIM when SMTP is configured. Staff can also read and track
 * enquiries in the admin dashboard.
 *
 * Email settings (.env):
 *   SMTP_HOST, SMTP_PORT (465 or 587), SMTP_USER, SMTP_PASS
 *   ENQUIRY_TO    recipient (defaults to IIM's general email)
 *   ENQUIRY_FROM  sender (defaults to SMTP_USER)
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const STATUSES = new Set(["new", "in_progress", "closed"]);
const PREFERRED_CONTACT = new Set(["email", "whatsapp", "phone"]);
const EMAIL_PATTERN = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[A-Za-z]{2,}$/;

function cleanLine(value, maximumLength) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, maximumLength);
}

function cleanText(value, maximumLength) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, maximumLength);
}

function createReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  let code = "";

  for (const byte of bytes) {
    code += alphabet[byte % alphabet.length];
  }

  return `IIM-${code}`;
}

/*
 * Returns { enquiry } or throws an Error with a visitor-facing message.
 */
function validateEnquiry(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Please fill in the enquiry form.");
  }

  const name = cleanLine(input.name, 100);
  const email = cleanLine(input.email, 254);
  const phone = cleanLine(input.phone, 30);
  const message = cleanText(input.message, 2000);
  const preferredContact = cleanLine(input.preferredContact, 20).toLowerCase();

  if (name.length < 2) {
    throw new Error("Please enter your name.");
  }

  if (email && !EMAIL_PATTERN.test(email)) {
    throw new Error("Please enter a valid email address.");
  }

  const phoneDigits = phone.replace(/\D/g, "");

  if (phone && (!/^[+\d\s().-]+$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15)) {
    throw new Error("Please enter a valid phone number, including the country code.");
  }

  if (!email && !phone) {
    throw new Error("Please give an email address or a phone number so IIM can reply.");
  }

  if (!PREFERRED_CONTACT.has(preferredContact)) {
    throw new Error("Please choose how you'd like IIM to reply.");
  }

  if (preferredContact === "email" && !email) {
    throw new Error("Please enter your email address, or choose WhatsApp or a phone call.");
  }

  if (preferredContact !== "email" && !phone) {
    throw new Error("Please enter your phone number, or choose email.");
  }

  if (message.length < 10) {
    throw new Error("Please describe your enquiry in a little more detail.");
  }

  if (input.consent !== true) {
    throw new Error("Please confirm that IIM may use these details to reply to you.");
  }

  return {
    name,
    email,
    phone,
    preferredContact,
    message,
    embedded: input.embedded === true,
  };
}

const CONTACT_LABELS = {
  email: "Email",
  whatsapp: "WhatsApp",
  phone: "Phone call",
};

function buildEmail(enquiry, recipient, sender) {
  const lines = [
    "A visitor sent this enquiry through the IIM website assistant.",
    "",
    `Reference: ${enquiry.reference}`,
    `Received: ${new Date(enquiry.at).toUTCString()}`,
    "",
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email || "not given"}`,
    `Phone / WhatsApp: ${enquiry.phone || "not given"}`,
    `Preferred reply: ${CONTACT_LABELS[enquiry.preferredContact]}`,
    "",
    "Message:",
    enquiry.message,
    "",
    "---",
    enquiry.email
      ? "Replying to this email goes to the visitor."
      : "The visitor gave no email address. Reply by phone or WhatsApp.",
  ];

  return {
    from: sender,
    to: recipient,
    replyTo: enquiry.email || undefined,
    subject: `Website enquiry ${enquiry.reference} from ${enquiry.name}`,
    text: lines.join("\n"),
  };
}

function createSmtpMailer() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const nodemailer = require("nodemailer");
  const port = Number(process.env.SMTP_PORT || 465);

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

module.exports = function registerEnquiryApi(app, options) {
  const enquiryPath = options.enquiryPath;
  const requireAdmin = options.requireAdmin;
  const rateLimit =
    options.rateLimit || ((request, response, next) => next());
  const mailer =
    options.mailer !== undefined ? options.mailer : createSmtpMailer();

  function recipient() {
    return (
      process.env.ENQUIRY_TO ||
      (options.getDefaultRecipient && options.getDefaultRecipient()) ||
      "info@iim-africa.org"
    );
  }

  function readAll() {
    if (!fs.existsSync(enquiryPath)) {
      return [];
    }

    return fs
      .readFileSync(enquiryPath, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  /* Synchronous writes keep concurrent requests from interleaving. */
  function writeAll(entries) {
    fs.mkdirSync(path.dirname(enquiryPath), { recursive: true });

    const temporaryPath = `${enquiryPath}.tmp`;
    fs.writeFileSync(
      temporaryPath,
      entries.map((entry) => JSON.stringify(entry)).join("\n") + (entries.length ? "\n" : ""),
      "utf8"
    );
    fs.renameSync(temporaryPath, enquiryPath);
  }

  function updateEntry(id, changes) {
    const entries = readAll();
    const entry = entries.find((item) => item.id === id);

    if (!entry) {
      return null;
    }

    Object.assign(entry, changes);
    writeAll(entries);

    return entry;
  }

  app.post("/api/enquiry", rateLimit, async (request, response) => {
    const body = request.body || {};

    /* Hidden field that people never fill in; bots often do. */
    if (typeof body.website === "string" && body.website.trim()) {
      return response.status(201).json({
        received: true,
        reference: createReference(),
      });
    }

    let enquiry;

    try {
      enquiry = validateEnquiry(body);
    } catch (error) {
      return response.status(400).json({ error: error.message });
    }

    enquiry = {
      id: crypto.randomUUID(),
      reference: createReference(),
      at: new Date().toISOString(),
      ...enquiry,
      status: "new",
      emailStatus: mailer ? "pending" : "not_configured",
    };

    try {
      fs.mkdirSync(path.dirname(enquiryPath), { recursive: true });
      fs.appendFileSync(enquiryPath, `${JSON.stringify(enquiry)}\n`, "utf8");
    } catch (error) {
      console.error("Enquiry could not be saved:", error);

      return response.status(500).json({
        error: "Your enquiry could not be sent. Please email IIM directly.",
      });
    }

    let emailed = false;

    if (mailer) {
      try {
        await mailer.sendMail(
          buildEmail(
            enquiry,
            recipient(),
            process.env.ENQUIRY_FROM || process.env.SMTP_USER
          )
        );
        emailed = true;
        updateEntry(enquiry.id, { emailStatus: "sent" });
      } catch (error) {
        console.error(`Enquiry ${enquiry.reference} email failed:`, error.message);
        updateEntry(enquiry.id, { emailStatus: "failed" });
      }
    }

    response.status(201).json({
      received: true,
      reference: enquiry.reference,
      emailed,
    });
  });

  app.get("/api/admin/enquiries", requireAdmin, (request, response) => {
    const entries = readAll();
    const count = (status) =>
      entries.filter((entry) => entry.status === status).length;

    response.set("Cache-Control", "no-store").json({
      summary: {
        total: entries.length,
        new: count("new"),
        inProgress: count("in_progress"),
        closed: count("closed"),
      },
      emailConfigured: Boolean(mailer),
      entries: entries.slice().reverse(),
    });
  });

  app.patch("/api/admin/enquiries/:id", requireAdmin, (request, response) => {
    const status = (request.body || {}).status;

    if (!STATUSES.has(status)) {
      return response.status(400).json({
        error: "Status must be new, in_progress or closed.",
      });
    }

    const entry = updateEntry(request.params.id, { status });

    if (!entry) {
      return response.status(404).json({ error: "Enquiry not found." });
    }

    response.json({ enquiry: entry });
  });
};

module.exports.validateEnquiry = validateEnquiry;
module.exports.buildEmail = buildEmail;
