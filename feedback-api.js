"use strict";

/*
 * Answer feedback (thumbs up / down).
 *
 * The chat endpoint registers every answer it sends with
 * rememberAnswer(). The browser rates an answer by its ID only,
 * so the stored question and answer are always what the server
 * actually produced, never text supplied by the visitor.
 *
 * Ratings are appended to a JSON Lines file kept beside the live
 * knowledge base (outside git in production).
 */

const fs = require("fs");
const crypto = require("crypto");

const ANSWER_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_REMEMBERED_ANSWERS = 5000;
const MAX_LISTED_ENTRIES = 500;

/*
 * Remove the most common personal details before a visitor's
 * question is written to disk.
 */
function redactPersonalDetails(text) {
  return String(text || "")
    .replace(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
      "[email removed]"
    )
    .replace(
      /(?:\+?\d[\s-]?){7,}/g,
      "[number removed]"
    );
}

function csvCell(value) {
  const text = Array.isArray(value)
    ? value.join("; ")
    : String(value === undefined || value === null ? "" : value);

  /* Neutralise spreadsheet formulas as well as quoting. */
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;

  return `"${safe.replace(/"/g, '""')}"`;
}

module.exports = function registerFeedbackApi(app, options) {
  const feedbackPath = options.feedbackPath;
  const requireAdmin = options.requireAdmin;
  const rateLimit =
    options.rateLimit || ((request, response, next) => next());

  /* responseId -> { question, answer, sources, meta, createdAt, rated } */
  const answers = new Map();

  function pruneAnswers() {
    const cutoff = Date.now() - ANSWER_TTL_MS;

    for (const [id, entry] of answers) {
      if (
        entry.createdAt < cutoff ||
        answers.size > MAX_REMEMBERED_ANSWERS
      ) {
        answers.delete(id);
      } else {
        break;
      }
    }
  }

  function rememberAnswer({ question, answer, sources, meta }) {
    pruneAnswers();

    const responseId = crypto.randomUUID();

    answers.set(responseId, {
      question: redactPersonalDetails(question).slice(0, 1500),
      answer: String(answer || "").slice(0, 6000),
      sources: Array.isArray(sources) ? sources.slice(0, 10) : [],
      provider: (meta && meta.provider) || null,
      fallbackReason: (meta && meta.fallbackReason) || null,
      createdAt: Date.now(),
      rated: false,
    });

    return responseId;
  }

  function readEntries() {
    if (!fs.existsSync(feedbackPath)) {
      return [];
    }

    return fs
      .readFileSync(feedbackPath, "utf8")
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

  app.post("/api/feedback", rateLimit, (request, response) => {
    const body = request.body || {};
    const responseId =
      typeof body.responseId === "string" ? body.responseId : "";
    const rating = body.rating;

    if (rating !== "up" && rating !== "down") {
      return response.status(400).json({
        error: 'Rating must be "up" or "down".',
      });
    }

    const answer = answers.get(responseId);

    if (!answer || Date.now() - answer.createdAt > ANSWER_TTL_MS) {
      return response.status(404).json({
        error: "This answer can no longer be rated.",
      });
    }

    if (answer.rated) {
      return response.status(409).json({
        error: "This answer has already been rated.",
      });
    }

    const entry = {
      at: new Date().toISOString(),
      rating,
      question: answer.question,
      answer: answer.answer,
      sources: answer.sources,
      provider: answer.provider,
      fallbackReason: answer.fallbackReason,
      embedded: body.embedded === true,
    };

    try {
      fs.appendFileSync(feedbackPath, `${JSON.stringify(entry)}\n`, "utf8");
    } catch (error) {
      console.error("Feedback could not be saved:", error);

      return response.status(500).json({
        error: "Feedback could not be saved.",
      });
    }

    answer.rated = true;
    response.status(201).json({ saved: true });
  });

  app.get("/api/admin/feedback", requireAdmin, (request, response) => {
    const entries = readEntries();
    const up = entries.filter((entry) => entry.rating === "up").length;

    response.set("Cache-Control", "no-store").json({
      summary: {
        total: entries.length,
        up,
        down: entries.length - up,
      },
      entries: entries.slice(-MAX_LISTED_ENTRIES).reverse(),
    });
  });

  app.get("/api/admin/feedback.csv", requireAdmin, (request, response) => {
    const columns = [
      "at",
      "rating",
      "question",
      "answer",
      "sources",
      "provider",
      "fallbackReason",
      "embedded",
    ];

    const rows = readEntries().map((entry) =>
      columns.map((column) => csvCell(entry[column])).join(",")
    );

    response
      .set("Cache-Control", "no-store")
      .type("text/csv")
      .attachment("iim-chatbot-feedback.csv")
      .send(`﻿${[columns.join(","), ...rows].join("\r\n")}\r\n`);
  });

  return { rememberAnswer };
};

module.exports.redactPersonalDetails = redactPersonalDetails;
