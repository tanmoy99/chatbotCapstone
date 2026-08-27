"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = path.join(__dirname, "..");

global.window = global;
global.IIM_KB_DATA = JSON.parse(
  fs.readFileSync(
    path.join(projectRoot, "data", "knowledge-base.json"),
    "utf8"
  )
);

for (const file of ["knowledge.js", "rag.js"]) {
  vm.runInThisContext(
    fs.readFileSync(path.join(projectRoot, "public", file), "utf8"),
    { filename: file }
  );
}

const positiveQueries = [
  "How much is PMIIM?",
  "What does PMIIM cost?",
  "What are the PMIIM fees?",
  "What is the PMIIM price?",
  "What are the PMIIM charges?",
  "How much is Professional Membership?",
  "What is the Professional Member annual fee?",
  "Tell me the registration and induction fees for PMIIM.",
  "Professional Member registration, induction and annual fees",
];

for (const query of positiveQueries) {
  const retrieval = global.IIM_RAG.retrieveWithMeta(query, 4);

  assert.strictEqual(
    retrieval.hasReliableMatch,
    true,
    `Expected a reliable match for: ${query}`
  );
  assert.strictEqual(
    retrieval.results[0] && retrieval.results[0].id,
    "ng_membership_fees",
    `Expected the approved membership fee record to rank first for: ${query}`
  );
  assert.strictEqual(
    retrieval.results[0] && retrieval.results[0].verified,
    true,
    `Expected an approved source for: ${query}`
  );
}

const negativeQueries = [
  "How much is it?",
  "What is PM?",
  "How much is parking?",
  "What are the charges for delivery?",
  "What is the price of lunch?",
];

for (const query of negativeQueries) {
  const retrieval = global.IIM_RAG.retrieveWithMeta(query, 4);

  assert.strictEqual(
    retrieval.hasReliableMatch,
    false,
    `Expected no reliable match for unrelated query: ${query}`
  );
  assert.strictEqual(
    retrieval.results.some((result) => result.id === "ng_membership_fees"),
    false,
    `Must not retrieve PMIIM fees for unrelated query: ${query}`
  );
}

console.log(
  `PMIIM retrieval regression tests passed (${positiveQueries.length} positive, ${negativeQueries.length} negative).`
);
