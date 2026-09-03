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
  const transcript = `${recentText} \n ${query}`.trim();
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

  if (explicitMembership && /\b(?:join|become|apply|member|membership)\b/.test(query)) {
    return { type: "membership_joining", retrievalQuery: "IIM membership categories grades eligibility application approval how to join", requiredSourceIds: ["ng_membership_categories", "ng_membership_grade_eligibility"] };
  }

  if (asksRecommendation && trainingContext && itBackground) {
    return { type: "it_training_recommendation", retrievalQuery: "IIM training subject areas database management information security geographic information systems", requiredSourceIds: ["training_areas"], allowedSourceIds: ["training_areas"] };
  }

  if (!fee && /\b(?:course|courses|training|subject areas?)\b/.test(query) && /\b(?:offer|offers|available|list|what|which)\b/.test(query)) {
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

  return { type: "default", retrievalQuery: message, requiredSourceIds: [] };
}

module.exports = {
  isRefundPolicyQuery,
  resolveConversationIntent,
};
