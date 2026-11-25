"use strict";

/*
 * Readers for the knowledge records the assistant quotes directly
 * (see docs/knowledge-base-maintenance.md). Shared by server.js,
 * which builds answers from them, and scripts/validate-kb.js, which
 * checks the records still have the format these readers expect.
 */

/* Grades with per-grade fee and requirement answers. */
const QUOTED_GRADES = [
  { key: "senior professional", label: "Senior Professional Member (SPMIIM)", pattern: /\b(?:spmiim|senior professional)\b/, sentenceStart: /^Senior Professional Member\b/ },
  { key: "fellow", label: "Fellow Member (FIIM)", pattern: /\b(?:fiim|fellow|fellowship)\b/, sentenceStart: /^Fellow Member\b/ },
  { key: "associate", label: "Associate Member (AMIIM)", pattern: /\b(?:amiim|associate)\b/, sentenceStart: /^Associate Member\b/ },
  { key: "graduate", label: "Graduate Member (GMIIM)", pattern: /\b(?:gmiim|graduate)\b/, sentenceStart: /^Graduate Member\b/ },
  { key: "corporate", label: "Corporate Member (CORMIIM)", pattern: /\b(?:cormiim|corporate)\b/, sentenceStart: /^Corporate membership\b/i },
];

function splitSentences(text) {
  return String(text || "").split(/(?<=\.)\s+(?=[A-Z])/);
}

function firstSentence(text) {
  return splitSentences(text)[0].trim();
}

/*
 * "... were: Student - registration exempt, annual subscription
 * USD 50; Graduate - ...; Corporate - ... USD 245. The page ..."
 * -> { fees: Map(grade -> "registration USD 100, ..."), asOf }
 */
function parseMembershipFees(text) {
  const source = String(text || "");
  const start = source.indexOf(" were:");

  if (start === -1) {
    return null;
  }

  const list = source.slice(start + 6).split(/\.\s/)[0];
  const fees = new Map();

  for (const entry of list.split(";")) {
    const match = entry.trim().match(/^([A-Za-z ]+?)\s+-\s+(.+)$/);

    if (match) {
      fees.set(match[1].trim().toLowerCase(), match[2].trim().replace(/\.$/, ""));
    }
  }

  const asOf = (source.match(/\bon (\d{1,2} [A-Z][a-z]+ \d{4})\b/) || [])[1] || null;

  return fees.size ? { fees, asOf } : null;
}

function findGradeSentence(text, grade) {
  const sentence = splitSentences(text).find((part) => grade.sentenceStart.test(part));
  return sentence ? sentence.trim() : null;
}

/*
 * Problems that would make a quoted answer fall back to the model.
 * documents: the knowledge-base documents array.
 */
function checkQuotedRecords(documents) {
  const problems = [];
  const byId = new Map((documents || []).map((document) => [document.id, document]));

  const fees = byId.get("ng_membership_fees");
  const parsed = fees && parseMembershipFees(fees.text);

  if (!parsed) {
    problems.push('ng_membership_fees: expected "... were: Grade - amounts; Grade - amounts; ..." so fee answers can quote it.');
  } else {
    for (const grade of QUOTED_GRADES) {
      if (!parsed.fees.has(grade.key)) {
        problems.push(`ng_membership_fees: no "${grade.key}" entry; fee questions for that grade will go to the AI model.`);
      }
    }
  }

  const eligibility = byId.get("ng_membership_grade_eligibility");

  for (const grade of QUOTED_GRADES) {
    if (!eligibility || !findGradeSentence(eligibility.text, grade)) {
      problems.push(`ng_membership_grade_eligibility: no sentence starting "${grade.sentenceStart.source.replace(/^\^|\\b$/g, "")}".`);
    }
  }

  for (const id of ["au_contact", "sa_contact"]) {
    const record = byId.get(id);

    if (record && !/\b(?:phone|email)\b/i.test(firstSentence(record.text))) {
      problems.push(`${id}: the first sentence should hold the address, phone and email.`);
    }
  }

  return problems;
}

module.exports = {
  QUOTED_GRADES,
  firstSentence,
  parseMembershipFees,
  findGradeSentence,
  checkQuotedRecords,
};
