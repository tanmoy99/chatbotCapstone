"use strict";

const REFUND_POLICY_FALLBACK =
  "I couldn't find an approved IIM refund policy in the current knowledge base. " +
  "Please contact IIM at info@iim-africa.org for official refund information.";

function isRefundPolicyQuery(value) {
  const query = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  /* Covers refund, refunds, refunded, refunding, and the common truncated
   * misspelling "refun" without fuzzy-matching unrelated short words. */
  return /\brefun(?:d(?:s|ed|ing)?)?\b/.test(query);
}

module.exports = {
  isRefundPolicyQuery,
  REFUND_POLICY_FALLBACK,
};
