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

function normalizeQuery(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((token) => ({ studnt: "student", corse: "course", corses: "courses", sugest: "suggest" }[token] || token))
    .join(" ");
}

const TRAINING_AREAS = [
  "archiving and preservation",
  "archives management",
  "database management",
  "document management",
  "geographic information systems",
  "health information management",
  "information security",
  "knowledge management",
  "library management",
  "records information management",
];

function mentionedTrainingAreas(value) {
  const query = normalizeQuery(value).replace(/\brecords and information\b/g, "records information");
  return TRAINING_AREAS.filter((area) => query.includes(area));
}

function resolveConversationIntent(message, history) {
  const query = normalizeQuery(message);
  const safeHistory = Array.isArray(history) ? history : [];
  const recentText = safeHistory.slice(-6).map((item) => normalizeQuery(item && item.content)).join(" \n ");
  const stiim = /\b(?:stiim|student member(?:ship)?)\b/.test(query);
  const benefits = /\b(?:benefit|benefits|benifit|benifits|advantage|advantages)\b/.test(query);
  const fee = /\b(?:fee|fees|cost|price|how much|charge|charges)\b/.test(query);
  const eligibility = /\b(?:eligible|eligibility|qualify|qualification|requirement|requirements|who can|what is stiim)\b/.test(query);

  if (stiim && benefits) {
    return { type: "stiim_benefits", retrievalQuery: "STIIM student membership eligibility membership benefits", requiredSourceIds: ["ng_membership_grade_eligibility", "membership_benefits"] };
  }
  if (stiim && fee) {
    return { type: "stiim_fees", retrievalQuery: "STIIM Student Member Nigeria membership fees annual subscription", requiredSourceIds: ["ng_membership_fees"] };
  }
  if (stiim && (eligibility || !fee)) {
    return { type: "stiim_eligibility", retrievalQuery: "STIIM Student Member membership eligibility", requiredSourceIds: ["ng_membership_grade_eligibility"] };
  }

  const immediateHistory = safeHistory.slice(-2).map((item) => normalizeQuery(item && item.content)).join(" \n ");
  const currentTrainingTopic = /\b(?:course|courses|training|subject areas?|workshops?|programmes?|programs?)\b/.test(query);
  const recentTrainingTopic = /\b(?:course|courses|training|subject areas?|workshops?|programmes?|programs?)\b/.test(immediateHistory);
  const trainingContext = currentTrainingTopic || recentTrainingTopic;
  const asksRecommendation = /\b(?:which one|which course|good for me|best for me|recommend|recommendation|suggest|suggestion|suitable|suit|fits? me)\b/.test(query);
  const itBackground = /\b(?:it|information technology|computing|computer science|software|technology)\b/.test(query) && /\b(?:student|study|studying|background|work|working)\b/.test(query);

  const explicitMembership = /\b(?:student membership|student member|stiim|membership|membership grade|membership fee|member benefits?|join iim|join the iim|become (?:an? )?(?:iim )?member)\b/.test(query);

  const joining = /\b(?:join|become|apply|application|process|procedure|steps)\b/.test(query);
  const specificGrade = /\b(?:pmiim|spmiim|gmiim|amiim|fiim|professional|graduate|associate|fellow|senior)\b/.test(query);
  // Questions that need a different source (or are about another organisation)
  // must reach normal retrieval instead of a fixed membership template.
  const otherMembershipTopic = /\b(?:upgrade|upgrading|corporate|company|organi[sz]ation|organi[sz]ations|unrelated|another|other|contact|email|phone|department|departments|renew|renewal)\b/.test(query);
  const asksCategories = /\b(?:categor(?:y|ies)|grades?|types?|levels?|kinds?|options|offer|offers|offered|available)\b/.test(query) || /^(?:iim )?membership$/.test(query);
  if (explicitMembership && asksCategories && !fee && !benefits && !specificGrade && !otherMembershipTopic && !isRefundPolicyQuery(query)) {
    return { type: "membership_categories", retrievalQuery: "IIM membership categories grades", requiredSourceIds: ["ng_membership_categories"], allowedSourceIds: ["ng_membership_categories"] };
  }
  if (explicitMembership && joining && !fee && !benefits && !otherMembershipTopic) {
    return { type: /\bstudent\b/.test(query) ? "student_membership_joining" : "membership_joining", retrievalQuery: "IIM membership categories grades eligibility application approval how to join", requiredSourceIds: ["ng_membership_categories", "ng_membership_grade_eligibility"], allowedSourceIds: ["ng_membership_categories", "ng_membership_grade_eligibility"] };
  }
  if (explicitMembership && benefits && !specificGrade && !otherMembershipTopic) {
    return { type: "membership_benefits", retrievalQuery: "IIM membership benefits", requiredSourceIds: ["membership_benefits"], allowedSourceIds: ["membership_benefits"] };
  }
  if (/\bdata protection officer\b/.test(query) && /\bcertification\b/.test(query) && /\b(?:which|fits?|suitable|recommend)\b/.test(query)) {
    return { type: "cdpo_recommendation", retrievalQuery: "CDPO certification data protection officer", requiredSourceIds: ["cdpo_overview"], allowedSourceIds: ["cdpo_overview"] };
  }

  if (asksRecommendation && trainingContext && itBackground) {
    return { type: "it_training_recommendation", retrievalQuery: "IIM training subject areas database management information security geographic information systems", requiredSourceIds: ["training_areas"], allowedSourceIds: ["training_areas"] };
  }

  // Questions about who delivers training (accredited providers) are a
  // different topic from which courses exist.
  const aboutTrainingProviders = /\b(?:atos?|accredited training|training (?:providers?|organi[sz]ations?|partners?|centres?|centers?))\b/.test(query);

  if (!fee && !aboutTrainingProviders && /\b(?:course|courses|training|subject areas?)\b/.test(query) && /\b(?:offer|offers|available|list|what|which)\b/.test(query)) {
    return { type: "training_overview", retrievalQuery: "IIM training courses subject areas", requiredSourceIds: ["training_areas"], allowedSourceIds: ["training_areas"] };
  }

  const referentialCourseFee = fee && /\b(?:that|this|the|selected|recommended)\s+(?:course|training|one)\b/.test(query);
  if (referentialCourseFee && trainingContext) {
    const latestExplicitUserSelection = [...safeHistory]
      .reverse()
      .filter((item) => item && item.role === "user")
      .map((item) => mentionedTrainingAreas(item.content))
      .find((areas) => areas.length === 1);
    if (latestExplicitUserSelection) {
      const selectedCourse = latestExplicitUserSelection[0];
      return { type: "selected_course_fee", selectedCourse, retrievalQuery: `${selectedCourse} training course`, requiredSourceIds: ["training_areas"] };
    }
    const areas = mentionedTrainingAreas(recentText);
    const uniqueAreas = [...new Set(areas)];
    if (uniqueAreas.length === 1) {
      return { type: "selected_course_fee", selectedCourse: uniqueAreas[0], retrievalQuery: `${uniqueAreas[0]} training course`, requiredSourceIds: ["training_areas"] };
    }
    return { type: "ambiguous_course_fee", retrievalQuery: "IIM training subject areas courses", requiredSourceIds: ["training_areas"] };
  }

  // "What does IIM do?", "what IIM do in Nigeria", or just "IIM": a general
  // question about the institute. "IIM" alone is too common a word for
  // retrieval to rely on, so route these to the overview, unless the
  // question names a specific topic, which normal retrieval handles.
  // Every word must be general; any other word ("conference", "fees",
  // "mission", ...) means a specific question for normal retrieval.
  const GENERAL_WORDS = new Set([
    "what", "whats", "s", "does", "do", "is", "are", "doing", "about", "tell", "me", "us",
    "the", "a", "an", "of", "in", "for", "exactly", "actually", "really", "please",
    "iim", "institute", "information", "management", "organisation", "organization",
    "nigeria", "australia", "south", "africa",
  ]);
  const words = query.replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  const namesIim = words.includes("iim") || words.includes("institute");
  const onlyGeneralWords = words.length > 0 && words.every((word) => GENERAL_WORDS.has(word));
  const asksWhatItIs = words.length === 1 || words.includes("what") || words.includes("tell");

  if (namesIim && onlyGeneralWords && asksWhatItIs) {
    return { type: "about_iim", retrievalQuery: "about iim what is iim institute information management", requiredSourceIds: ["about_iim_overview"] };
  }

  return { type: "default", retrievalQuery: message, requiredSourceIds: [] };
}

module.exports = {
  isRefundPolicyQuery,
  resolveConversationIntent,
};
