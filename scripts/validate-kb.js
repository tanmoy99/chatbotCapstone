"use strict";

const fs = require("fs");
const path = require("path");

const dataPath = path.join(
  __dirname,
  "..",
  "data",
  "knowledge-base.json"
);

const loaderPath = path.join(
  __dirname,
  "..",
  "public",
  "knowledge.js"
);

const allowedStatuses = new Set([
  "stable",
  "dynamic",
  "verify",
  "live",
]);

const errors = [];

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim() !== ""
  );
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

let data;

try {
  data = JSON.parse(
    fs.readFileSync(
      dataPath,
      "utf8"
    )
  );
} catch (error) {
  console.error(
    `Knowledge data could not be read: ${error.message}`
  );
  process.exit(1);
}

if (data.schemaVersion !== 1) {
  errors.push(
    "schemaVersion must be 1."
  );
}

if (!isNonEmptyString(data.knowledgeBaseVersion)) {
  errors.push(
    "knowledgeBaseVersion is required."
  );
}

if (!isNonEmptyString(data.lastReviewed)) {
  errors.push(
    "lastReviewed is required."
  );
}

if (
  !data.organization ||
  typeof data.organization !== "object"
) {
  errors.push(
    "organization must be an object."
  );
}

if (
  !data.contacts ||
  typeof data.contacts !== "object"
) {
  errors.push(
    "contacts must be an object."
  );
}

if (
  !data.sources ||
  typeof data.sources !== "object"
) {
  errors.push(
    "sources must be an object."
  );
}

if (!Array.isArray(data.documents)) {
  errors.push(
    "documents must be an array."
  );
}

const documents = Array.isArray(
  data.documents
)
  ? data.documents
  : [];

const ids = new Set();
const statusCounts = {};
const categoryCounts = {};

documents.forEach((document, index) => {
  const label =
    isNonEmptyString(document && document.id)
      ? document.id
      : `document ${index + 1}`;

  if (!document || typeof document !== "object") {
    errors.push(
      `Document ${index + 1} must be an object.`
    );
    return;
  }

  [
    "id",
    "scope",
    "category",
    "title",
    "status",
    "lastReviewed",
    "text",
    "source",
  ].forEach((field) => {
    if (!isNonEmptyString(document[field])) {
      errors.push(
        `${label}: ${field} is required.`
      );
    }
  });

  if (isNonEmptyString(document.id)) {
    if (ids.has(document.id)) {
      errors.push(
        `${label}: duplicate document ID.`
      );
    }

    ids.add(document.id);
  }

  if (!allowedStatuses.has(document.status)) {
    errors.push(
      `${label}: invalid status '${document.status}'.`
    );
  }

  if (
    !Array.isArray(document.keywords) ||
    document.keywords.some(
      (keyword) =>
        !isNonEmptyString(keyword)
    )
  ) {
    errors.push(
      `${label}: keywords must contain only non-empty strings.`
    );
  }

  if (
    isNonEmptyString(document.source) &&
    !isValidHttpUrl(document.source)
  ) {
    errors.push(
      `${label}: source must be a valid HTTP or HTTPS URL.`
    );
  }

  [
    "secondarySource",
    "liveListSource",
  ].forEach((field) => {
    if (
      document[field] !== undefined &&
      !isValidHttpUrl(document[field])
    ) {
      errors.push(
        `${label}: ${field} must be a valid HTTP or HTTPS URL.`
      );
    }
  });

  statusCounts[document.status] =
    (statusCounts[document.status] || 0) +
    1;

  categoryCounts[document.category] =
    (categoryCounts[document.category] || 0) +
    1;
});

if (
  !data.groundedResponses ||
  typeof data.groundedResponses !== "object" ||
  Array.isArray(data.groundedResponses)
) {
  errors.push(
    "groundedResponses must be an object."
  );
}

const groundedResponses =
  data.groundedResponses &&
  typeof data.groundedResponses === "object" &&
  !Array.isArray(data.groundedResponses)
    ? data.groundedResponses
    : {};

Object.entries(
  groundedResponses
).forEach(
  ([responseId, response]) => {
    if (!isNonEmptyString(responseId)) {
      errors.push(
        "Every grounded response requires an ID."
      );
      return;
    }

    if (
      !response ||
      typeof response !== "object" ||
      Array.isArray(response)
    ) {
      errors.push(
        `${responseId}: grounded response must be an object.`
      );
      return;
    }

    if (!isNonEmptyString(response.sourceId)) {
      errors.push(
        `${responseId}: sourceId is required.`
      );
    } else if (!ids.has(response.sourceId)) {
      errors.push(
        `${responseId}: sourceId '${response.sourceId}' does not match a knowledge document.`
      );
    }

    if (!isNonEmptyString(response.answer)) {
      errors.push(
        `${responseId}: approved answer is required.`
      );
    }
  }
);

if (errors.length > 0) {
  console.error(
    `Knowledge-base validation failed with ${errors.length} error(s):`
  );

  errors.forEach((error) => {
    console.error(`- ${error}`);
  });

  process.exit(1);
}

global.window = global;
global.IIM_KB_DATA = data;

require(loaderPath);

if (
  !global.IIM_KB ||
  global.IIM_KB.ragCorpus.length !==
    documents.length
) {
  console.error(
    "Knowledge loader did not produce the expected RAG corpus."
  );
  process.exit(1);
}

console.log(
  `Knowledge base valid: ${documents.length} documents`
);
console.log(
  `Statuses: ${JSON.stringify(statusCounts)}`
);
console.log(
  `Categories: ${Object.keys(categoryCounts).length}`
);
console.log(
  `Grounded responses: ${Object.keys(groundedResponses).length}`
);
console.log(
  `Version: ${data.knowledgeBaseVersion}`
);
