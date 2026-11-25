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

/* Questions that previously found nothing reliable, or the wrong topic. */
const { resolveConversationIntent } = require(path.join(projectRoot, "query-intents"));

function topIdsAfterIntent(query) {
  const intent = resolveConversationIntent(query, []);
  return idsFor(intent.retrievalQuery);
}

for (const [query, expectedTop, alsoExpected = []] of [
  /* Same-topic runner-up ("About IIM") must not make this unreliable. */
  ["What is IIM's mission?", "about_iim_mission_vision"],
  /* Plural "offices" must reach the office records. */
  ["Where are IIM's offices?", "ng_office_abuja", ["ng_office_lagos", "ng_office_ibadan"]],
  /* Training providers are not the course list. */
  ["What is an IIM Accredited Training Organisation?", "ato_overview"],
  /* "for" / "take" alone are not audience questions. */
  ["What is the IIM CDPO certification for?", "cdpo_overview"],
  ["Can I take the CDPO examination remotely?", "cdpo_process_exam"],
  /* Real audience questions still go to eligibility. */
  ["Who is eligible to take the CDPO certification?", "cdpo_eligibility"],
  ["Who is CDPO for?", "cdpo_eligibility"],
  /* General questions about the institute, however phrased. */
  ["what IIM do", "about_iim_overview"],
  ["what does IIM do in Nigeria", "about_iim_overview"],
  ["IIM", "about_iim_overview"],
  /* Specific topics are not swallowed by the overview. */
  ["What is IIM's mission?", "about_iim_mission_vision"],
  /* Course questions still list courses. */
  ["What training courses does IIM offer?", "training_areas"],
]) {
  const ids = topIdsAfterIntent(query);
  assert.strictEqual(ids[0], expectedTop, `Wrong top result for "${query}": ${ids.join(", ")}`);
  for (const id of alsoExpected) {
    assert(ids.includes(id), `Missing ${id} for "${query}": ${ids.join(", ")}`);
  }
}

for (const query of [
  "What is the weather in Paris?",
  "Tell me a joke",
  "What is the capital of France?",
]) {
  const result = global.IIM_RAG.retrieveWithMeta(query, 6);
  assert.strictEqual(result.hasReliableMatch, false, `Unexpected match for: ${query}`);
}

assert.strictEqual(global.IIM_RAG.normalize("waht requierments refun ofer memebr"),
  "what requirements refund offer member");
assert.strictEqual(global.IIM_RAG.normalize("CIM"), "cim");

console.log("RAG intent regression tests passed.");
