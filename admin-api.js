"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

module.exports = function registerAdminApi(app) {
  const adminPassword = String(
    process.env.ADMIN_PASSWORD || ""
  );

  const knowledgePath = path.join(
    __dirname,
    "data",
    "knowledge-base.json"
  );

  const backupDirectory = path.join(
    __dirname,
    "data",
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

    const suppliedPassword =
      request.get("x-admin-password") || "";

    if (!passwordsMatch(suppliedPassword)) {
      return response.status(401).json({
        error:
          "Incorrect admin password.",
      });
    }

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

    const source = requiredText(
      input.source,
      "Source URL",
      500
    );

    try {
      const parsedSource =
        new URL(source);

      if (
        ![
          "http:",
          "https:",
        ].includes(
          parsedSource.protocol
        )
      ) {
        throw new Error();
      }
    } catch {
      throw new Error(
        "Source must be a valid HTTP or HTTPS URL."
      );
    }

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

    return {
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
          documents[index] =
            document;
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

        const backup =
          saveKnowledge(data);

        response.json({
          saved: true,
          created:
            index < 0,
          document,
          backup,
          restartRequired:
            true,
          message:
            "Knowledge saved. Restart the server to activate the change.",
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