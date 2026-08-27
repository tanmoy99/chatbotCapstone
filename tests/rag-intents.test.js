"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = path.join(__dirname, "..");
global.window = global;
global.IIM_KB_DATA = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "data", "knowledge-base.json"), "utf8")
);
for (const file of ["knowledge.js", "rag.js"]) {
  vm.runInThisContext(
    fs.readFileSync(path.join(projectRoot, "public", file), "utf8"),
    { filename: file }
  );
}

function idsFor(query) {
  const result = global.IIM_RAG.retrieveWithMeta(query, 6);
  assert(result.hasReliableMatch, `Expected reliable retrieval for: ${query}`);
  return result.results.map((document) => document.id);
}

for (const query of [
  "How do I become a member?",
  "How can I join IIM?",
  "How do I become an IIM member?",
  "I want to apply for membership.",
  "What is the membership process?",
]) {
  const ids = idsFor(query);
  assert(ids.includes("ng_membership_categories"), `Missing categories for: ${query}`);
  assert(ids.includes("ng_membership_grade_eligibility"), `Missing eligibility for: ${query}`);
}

for (const query of [
  "What certifications does IIM offer?",
  "What certifications do you offer?",
  "Show me your available certifications.",
  "waht certifications do you ofer?",
]) {
  assert(idsFor(query).includes("certification_framework"), `Missing framework for: ${query}`);
}

for (const query of [
  "refund policy",
  "What is the IIM refund policy?",
  "Are membership payments refundable?",
  "waht is IIM refun policy",
]) {
  const ids = idsFor(query);
  assert.strictEqual(ids[0], "ng_membership_fees", `Fees must rank first for: ${query}`);
}

for (const query of [
  "What is CIM?",
  "What certifications does Microsoft offer?",
  "How do I join a gym?",
  "What is an airline refund policy?",
  "Tell me about an unrelated organisation's membership.",
]) {
  const result = global.IIM_RAG.retrieveWithMeta(query, 6);
  assert.strictEqual(result.hasReliableMatch, false, `Unexpected match for: ${query}`);
}

assert.strictEqual(global.IIM_RAG.normalize("waht requierments refun ofer memebr"),
  "what requirements refund offer member");
assert.strictEqual(global.IIM_RAG.normalize("CIM"), "cim");

console.log("RAG intent regression tests passed.");
