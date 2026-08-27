"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const {
  isRefundPolicyQuery,
} = require("../query-intents");

/* Evaluate the production Markdown functions themselves, without starting
 * the browser application or maintaining a second formatter in the tests. */
const appSource = fs.readFileSync(
  path.join(__dirname, "..", "public", "app.js"),
  "utf8"
);
const formatterStart = appSource.indexOf("  function escapeHtml");
const formatterEnd = appSource.indexOf("  function addMessage", formatterStart);

assert(formatterStart >= 0 && formatterEnd > formatterStart);

const formatterContext = {};
vm.createContext(formatterContext);
vm.runInContext(
  appSource.slice(formatterStart, formatterEnd) +
    "\nthis.markdownToHtml = markdownToHtml;",
  formatterContext
);

const numericText =
  "Fees are USD 100, USD 99, USD 180, and USD 1,800. " +
  "Applicants need 40 points and 2 years of experience. Reviewed in 2026. " +
  "A separate example remains USD 1.";
const numericHtml = formatterContext.markdownToHtml(numericText);

for (const value of [
  "USD 100",
  "USD 99",
  "USD 180",
  "USD 1,800",
  "40 points",
  "2 years",
  "2026",
  "USD 1",
]) {
  assert(
    numericHtml.includes(value),
    `Rendered HTML must preserve ${value}`
  );
}
assert(!numericHtml.includes("<ol>"), "Numeric prose must not become a list");

const legitimateListHtml = formatterContext.markdownToHtml(
  "Grades: 1. Student 2. Graduate 3. Professional"
);
assert(legitimateListHtml.includes("<ol>"));
assert.strictEqual(
  (legitimateListHtml.match(/<li>/g) || []).length,
  3,
  "Legitimate inline numbered lists must still render"
);

for (const query of [
  "refund policy",
  "waht is IIM refun policy",
  "Are refunds available?",
  "Are membership payments refundable?",
  "I am refunding a payment",
]) {
  assert(isRefundPolicyQuery(query), `Expected refund intent for: ${query}`);
}
for (const query of ["funding policy", "return to membership", "refine policy"]) {
  assert(!isRefundPolicyQuery(query), `Unexpected refund intent for: ${query}`);
}
const hyphenatedCertificationHtml = formatterContext.markdownToHtml(
  "Certifications include CDPO-Compliance (Certified Data Professional - Compliance), CDPP and CAMP."
);
assert.strictEqual(
  (hyphenatedCertificationHtml.match(/<li>/g) || []).length,
  0,
  "A hyphen inside a certification name must not become a list item"
);
console.log("Rendering and refund-intent regression tests passed.");
