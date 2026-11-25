"use strict";

/*
 * Membership grade answers: each grade gets its own fees and
 * requirements from the approved records, and the Professional
 * (PMIIM) templates never answer Senior Professional (SPMIIM)
 * questions.
 */

const assert = require("assert");

process.env.OLLAMA_KEEP_WARM = "false";

const { selectBestChunks, getGroundedTemplateAnswer } = require("../server");
const { resolveConversationIntent } = require("../query-intents");

function templateFor(question) {
  const intent = resolveConversationIntent(question, []);
  const retrieval = selectBestChunks(
    intent.retrievalQuery,
    intent.requiredSourceIds,
    intent.allowedSourceIds
  );
  return {
    chunks: retrieval.chunks,
    template: retrieval.chunks.length
      ? getGroundedTemplateAnswer(question, retrieval.chunks, intent)
      : null,
  };
}

/* Expected amounts, as written in data/knowledge-base.json. */
const expectations = [
  ["How much is Senior Professional membership?", "Senior Professional Member (SPMIIM)", ["USD 100", "USD 134", "USD 200"]],
  ["What is the SPMIIM fee?", "Senior Professional Member (SPMIIM)", ["USD 134", "USD 200"]],
  ["How much does Fellow membership cost?", "Fellow Member (FIIM)", ["USD 173", "USD 242"]],
  ["What are the Corporate Membership fees?", "Corporate Member (CORMIIM)", ["USD 100", "USD 237", "USD 245"]],
  ["Associate member fees?", "Associate Member (AMIIM)", ["USD 66", "USD 110"]],
  ["What does graduate membership cost?", "Graduate Member (GMIIM)", ["exempt", "USD 60", "USD 100"]],
];

for (const [question, label, amounts] of expectations) {
  const { template } = templateFor(question);
  assert(template, `Expected a fee answer for: ${question}`);
  assert.equal(template.id, "grade-membership-fees", question);
  assert(template.answer.includes(label), `${question} -> ${template.answer}`);
  for (const amount of amounts) {
    assert(template.answer.includes(amount), `${question} missing ${amount}: ${template.answer}`);
  }
  assert(/confirm the current amount/.test(template.answer), "fees flagged as changeable");
}

/* Senior Professional must never get the Professional (PMIIM) answers. */
for (const question of [
  "How much is Senior Professional membership?",
  "What is the SPMIIM fee?",
  "What are the requirements for Senior Professional Membership?",
]) {
  const { template } = templateFor(question);
  assert(
    !template || !/^professional-membership/.test(template.id),
    `PMIIM template used for: ${question}`
  );
  assert(!template || !template.answer.includes("USD 180"), `PMIIM fee given for: ${question}`);
}

/* Professional and Student keep their curated templates. */
assert.equal(templateFor("How much is Professional membership?").template.id, "professional-membership-fees");
assert.equal(templateFor("What are the requirements for PMIIM?").template.id, "professional-membership-eligibility");

/* Comparisons need more than one grade's fees; leave them to the model. */
assert.equal(templateFor("Compare fellow and associate fees").template, null);

/* Requirements per grade come from that grade's own sentence. */
for (const [question, label, phrases] of [
  ["How do I become an IIM Fellow?", "Fellow Member (FIIM)", ["eminence", "15 years", "committee/council"]],
  ["What are the requirements for Senior Professional Membership?", "Senior Professional Member (SPMIIM)", ["supervisory responsibility"]],
  ["Am I eligible for associate membership?", "Associate Member (AMIIM)", ["early-career"]],
  ["Who qualifies as a Graduate Member?", "Graduate Member (GMIIM)", ["recent graduates", "pre-induction"]],
  ["What are the requirements for corporate membership?", "Corporate Member (CORMIIM)", ["five employees"]],
]) {
  const { template } = templateFor(question);
  assert(template, `Expected a requirements answer for: ${question}`);
  assert.equal(template.id, "grade-membership-eligibility", question);
  assert(template.answer.startsWith(label), `${question} -> ${template.answer}`);
  for (const phrase of phrases) {
    assert(template.answer.includes(phrase), `${question} missing "${phrase}": ${template.answer}`);
  }
  /* Only the asked-about grade, not the whole ladder. */
  assert(!/Student Member is for/.test(template.answer), `${question} quoted other grades`);
}

/* General membership questions keep their overview answers. */
assert.equal(templateFor("How do I become an IIM member?").template.id, "membership-joining-overview");
assert.equal(templateFor("Am I eligible for professional membership?").template.id, "professional-membership-eligibility");

/* A changed fee record (e.g. an admin edit) is reflected directly. */
const { chunks } = templateFor("How much is Fellow membership?");
const edited = chunks.map((chunk) =>
  chunk.id === "ng_membership_fees"
    ? { ...chunk, text: chunk.text.replace("annual subscription USD 242", "annual subscription USD 260") }
    : chunk
);
const afterEdit = getGroundedTemplateAnswer("How much is Fellow membership?", edited, { type: "default" });
assert(afterEdit.answer.includes("USD 260") && !afterEdit.answer.includes("USD 242"));

console.log("Grounded fee tests passed.");
