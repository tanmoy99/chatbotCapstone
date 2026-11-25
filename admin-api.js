"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

module.exports = function registerAdminApi(
  app,
  options = {}
) {
  const adminPassword = String(
    process.env.ADMIN_PASSWORD || ""
  );

  const knowledgePath =
    options.knowledgePath ||
    path.join(
      __dirname,
      "data",
      "knowledge-base.json"
    );

  const onKnowledgeChange =
    typeof options.onKnowledgeChange ===
    "function"
      ? options.onKnowledgeChange
      : null;

  /* Backups live next to the active knowledge file. */
  const backupDirectory = path.join(
    path.dirname(knowledgePath),
    "backups"
  );

  function passwordsMatch(candidate) {
    if (
      !adminPassword ||
      typeof candidate !== "string"
    ) {
      return false;
    }

    const expected = Buffer.from(adminPassword);
    const received = Buffer.from(candidate);

    return (
      expected.length === received.length &&
      crypto.timingSafeEqual(expected, received)
    );
  }

  /*
   * Slow down password guessing: after too many failed
   * attempts from one address, refuse for a while.
   */
  const MAX_FAILED_ATTEMPTS = 5;
  const LOCKOUT_MS = 15 * 60 * 1000;
  const failedAttempts = new Map();

  function isLockedOut(key) {
    const entry = failedAttempts.get(key);

    if (!entry) {
      return false;
    }

    if (Date.now() - entry.firstFailure > LOCKOUT_MS) {
      failedAttempts.delete(key);
      return false;
    }

    return entry.count >= MAX_FAILED_ATTEMPTS;
  }

  function recordFailure(key) {
    const entry = failedAttempts.get(key);

    if (
      !entry ||
      Date.now() - entry.firstFailure > LOCKOUT_MS
    ) {
      failedAttempts.set(key, {
        count: 1,
        firstFailure: Date.now(),
      });
    } else {
      entry.count += 1;
    }
  }

  function requireAdmin(
    request,
    response,
    next
  ) {
    if (!adminPassword) {
      return response.status(503).json({
        error:
          "Admin access is not configured.",
      });
    }

    const clientKey =
      request.ip ||
      request.socket.remoteAddress ||
      "unknown";

    if (isLockedOut(clientKey)) {
      return response.status(429).json({
        error:
          "Too many failed attempts. Try again in 15 minutes.",
      });
    }

    const suppliedPassword =
      request.get("x-admin-password") || "";

    if (!passwordsMatch(suppliedPassword)) {
      recordFailure(clientKey);

      return response.status(401).json({
        error:
          "Incorrect admin password.",
      });
    }

    failedAttempts.delete(clientKey);
    next();
  }

  function loadKnowledge() {
    return JSON.parse(
      fs.readFileSync(
        knowledgePath,
        "utf8"
      )
    );
  }

  function requiredText(
    value,
    field,
    maximumLength
  ) {
    if (
      typeof value !== "string" ||
      !value.trim()
    ) {
      throw new Error(
        `${field} is required.`
      );
    }

    const cleaned = value.trim();

    if (
      cleaned.length >
      maximumLength
    ) {
      throw new Error(
        `${field} must be ${maximumLength} characters or fewer.`
      );
    }

    return cleaned;
  }

  function validUrl(value, field) {
    try {
      const parsed = new URL(value);

      if (
        ![
          "http:",
          "https:",
        ].includes(
          parsed.protocol
        )
      ) {
        throw new Error();
      }
    } catch {
      throw new Error(
        `${field} must be a valid HTTP or HTTPS URL.`
      );
    }

    return value;
  }

  function validateDocument(
    input,
    routeId
  ) {
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      throw new Error(
        "A knowledge document is required."
      );
    }

    const id = requiredText(
      routeId || input.id,
      "ID",
      80
    )
      .toLowerCase()
      .replace(/\s+/g, "_");

    if (
      !/^[a-z0-9_-]+$/.test(id)
    ) {
      throw new Error(
        "ID may contain only letters, numbers, hyphens and underscores."
      );
    }

    const allowedStatuses =
      new Set([
        "stable",
        "dynamic",
        "verify",
        "live",
      ]);

    const status = requiredText(
      input.status,
      "Status",
      20
    ).toLowerCase();

    if (
      !allowedStatuses.has(status)
    ) {
      throw new Error(
        "Status must be stable, dynamic, verify or live."
      );
    }

    const lastReviewed =
      requiredText(
        input.lastReviewed,
        "Review date",
        10
      );

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        lastReviewed
      )
    ) {
      throw new Error(
        "Review date must use YYYY-MM-DD format."
      );
    }

    const source = validUrl(
      requiredText(
        input.source,
        "Source URL",
        500
      ),
      "Source"
    );

    const keywords =
      Array.isArray(input.keywords)
        ? input.keywords
        : String(
            input.keywords || ""
          ).split(",");

    const cleanedKeywords = [
      ...new Set(
        keywords
          .map((keyword) =>
            String(keyword)
              .trim()
              .toLowerCase()
          )
          .filter(Boolean)
      ),
    ].slice(0, 30);

    if (!cleanedKeywords.length) {
      throw new Error(
        "At least one keyword is required."
      );
    }

    /*
     * Optional secondary links. The admin form does not edit
     * them, so an omitted field keeps the stored value.
     */
    const optionalSources = {};

    for (const field of [
      "secondarySource",
      "liveListSource",
    ]) {
      if (
        input[field] !== undefined &&
        input[field] !== null &&
        String(input[field]).trim()
      ) {
        optionalSources[field] =
          validUrl(
            requiredText(
              String(input[field]),
              field,
              500
            ),
            field
          );
      }
    }

    return {
      ...optionalSources,

      id,

      scope: requiredText(
        input.scope,
        "Scope",
        80
      ),

      category: requiredText(
        input.category,
        "Category",
        60
      ).toLowerCase(),

      title: requiredText(
        input.title,
        "Title",
        160
      ),

      status,

      active:
        input.active !== false,

      lastReviewed,

      keywords:
        cleanedKeywords,

      text: requiredText(
        input.text,
        "Knowledge text",
        6000
      ),

      source,
    };
  }

  function saveKnowledge(data) {
    fs.mkdirSync(
      backupDirectory,
      {
        recursive: true,
      }
    );

    const timestamp =
      new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    const backupPath =
      path.join(
        backupDirectory,
        `knowledge-base-${timestamp}.json`
      );

    fs.copyFileSync(
      knowledgePath,
      backupPath
    );

    const temporaryPath =
      `${knowledgePath}.tmp`;

    fs.writeFileSync(
      temporaryPath,
      `${JSON.stringify(
        data,
        null,
        2
      )}\n`,
      "utf8"
    );

    fs.renameSync(
      temporaryPath,
      knowledgePath
    );

    /*
     * Activate the change immediately. If the running
     * chatbot rejects the new data, put the previous
     * file back so disk and memory stay in agreement.
     */
    if (onKnowledgeChange) {
      try {
        onKnowledgeChange();
      } catch (error) {
        fs.copyFileSync(
          backupPath,
          knowledgePath
        );

        const rejected = new Error(
          `The change was not applied: ${error.message}`
        );
        rejected.code =
          "KNOWLEDGE_RELOAD_FAILED";
        throw rejected;
      }
    }

    return path.basename(
      backupPath
    );
  }

  app.post(
    "/api/admin/login",
    requireAdmin,
    (request, response) => {
      response.json({
        authenticated: true,
      });
    }
  );

  app.get(
    "/api/admin/documents",
    requireAdmin,
    (request, response) => {
      const data =
        loadKnowledge();

      response
        .set(
          "Cache-Control",
          "no-store"
        )
        .json({
          documents:
            Array.isArray(
              data.documents
            )
              ? data.documents
              : [],

          version:
            data.knowledgeBaseVersion ||
            "",

          lastReviewed:
            data.lastReviewed ||
            "",
        });
    }
  );

  app.put(
    "/api/admin/documents/:id",
    requireAdmin,
    (request, response) => {
      try {
        const data =
          loadKnowledge();

        const document =
          validateDocument(
            request.body,
            request.params.id
          );

        const documents =
          Array.isArray(
            data.documents
          )
            ? data.documents
            : [];

        const index =
          documents.findIndex(
            (item) =>
              item.id ===
              document.id
          );

        if (index >= 0) {
          const preserved = {};

          for (const field of [
            "secondarySource",
            "liveListSource",
          ]) {
            if (
              documents[index][field] &&
              !document[field]
            ) {
              preserved[field] =
                documents[index][field];
            }
          }

          documents[index] = {
            ...preserved,
            ...document,
          };
        } else {
          documents.push(
            document
          );
        }

        data.documents =
          documents;

        data.lastReviewed =
          new Date()
            .toISOString()
            .slice(0, 10);

        let backup;

        try {
          backup =
            saveKnowledge(data);
        } catch (error) {
          if (
            error.code ===
            "KNOWLEDGE_RELOAD_FAILED"
          ) {
            return response
              .status(400)
              .json({
                error:
                  error.message,
              });
          }

          console.error(
            "Knowledge save failed:",
            error
          );

          return response
            .status(500)
            .json({
              error:
                "The knowledge base could not be saved. Check the server log.",
            });
        }

        response.json({
          saved: true,
          created:
            index < 0,
          document:
            index >= 0
              ? documents[index]
              : document,
          backup,
          restartRequired:
            !onKnowledgeChange,
          message:
            onKnowledgeChange
              ? "Knowledge saved and now live in the chatbot."
              : "Knowledge saved. Restart the server to activate the change.",
        });
      } catch (error) {
        response
          .status(400)
          .json({
            error:
              error.message,
          });
      }
    }
  );
};