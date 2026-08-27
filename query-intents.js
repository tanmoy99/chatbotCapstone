"use strict";

function isRefundPolicyQuery(value) {
  const query = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  /* Covers refund, refunds, refunded, refunding, refundable, and the common
   * truncated misspelling "refun" without matching unrelated short words. */
  return /\b(?:refund(?:s|ed|ing|able)?|refun)\b/.test(query);
}

module.exports = {
  isRefundPolicyQuery,
};
