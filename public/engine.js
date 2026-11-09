/*
 * IIM Chatbot — Intent Matching Engine
 * Lightweight, transparent, offline scorer. Global IIM_Engine.
 */
window.IIM_Engine = (function () {
  function normalize(text) {
    return (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function scoreIntent(text, intent) {
    const t = normalize(text);
    if (!intent.keywords || intent.keywords.length === 0) return 0;
    let score = 0;
    const tokens = t.split(" ").filter(Boolean);
    for (const kw of intent.keywords) {
      const k = normalize(kw);
      if (!k) continue;
      if (t.includes(k)) {
        score += k.split(" ").length >= 2 ? 3 : 1;
      } else {
        const kwTokens = k.split(" ").filter(Boolean);
        const overlap = kwTokens.filter((x) => tokens.includes(x)).length;
        if (overlap > 0) score += overlap * 0.5;
      }
    }
    return score;
  }

  function classify(text, intents) {
    let best = null;
    let bestScore = 0;
    for (const intent of intents) {
      if (intent.id === "fallback") continue;
      const s = scoreIntent(text, intent);
      if (s > bestScore) {
        bestScore = s;
        best = intent;
      }
    }
    const fallback = intents.find((i) => i.id === "fallback");
    if (!best || bestScore < 1) {
      return { intent: fallback, score: bestScore, confident: false };
    }
    return { intent: best, score: bestScore, confident: bestScore >= 2 };
  }

  const intentSources = {
    about_iim: ["about_iim_overview", "about_iim_mission_vision"],
    certification_overview: ["certification_framework"],
    cdp_certification: ["cdpo_overview"],
    how_to_certify: ["certification_process"],
    exam_info: ["cdpo_process_exam"],
    membership_info: ["ng_membership_categories", "membership_benefits"],
    membership_fees: ["ng_membership_fees"],
    membership_benefits: ["membership_benefits"],
    training_programs: ["training_areas", "ato_overview"],
    events_conferences: ["events_dynamic_policy"],
    advisory_services: ["consultancy_services"],
    professional_affiliation: ["cert_verification"],
    contact_human: ["contact_departments"],
  };

  function respond(text, chunks) {
    const result = classify(text, window.IIM_KB.intents);
    let intentId = result.intent ? result.intent.id : "fallback";
    const query = normalize(text);
    const otherMembershipTopic = /\b(?:upgrade|upgrading|corporate|company|organi[sz]ations?|unrelated|another|other|renew|renewal)\b/.test(query);
    if (intentId !== "contact_human" && !otherMembershipTopic && /\bmembership\b/.test(query)) {
      intentId = /\b(?:fees?|cost|price)\b/.test(query)
        ? "membership_fees"
        : /\bbenefits?\b/.test(query) ? "membership_benefits" : "membership_info";
    }
    if (/\bdata protection officer\b/.test(query) && /\bcertification\b/.test(query)) intentId = "cdp_certification";
    // JSON intents cannot contain response functions. Use approved active text;
    // Use the strongest source only: related retrieval hits are not necessarily
    // relevant enough to quote without a model synthesising the answer.
    const ids = Array.isArray(chunks)
      ? chunks.slice(0, 1).map((chunk) => chunk.id)
      : (intentSources[intentId] || []).slice(0, 1);
    const documents = ids.map((id) => window.IIM_KB.knowledge.find(
      (document) => document.id === id && document.active !== false
    )).filter(Boolean);
    return {
      intentId,
      score: result.score,
      confident: result.confident && documents.length > 0,
      text: documents.length
        ? documents.map((document) => document.text).join("\n\n")
        : "I couldn't confirm an answer from the available IIM information. Please choose a topic or contact IIM for help.",
      sources: documents.map((document) => document.title),
      quickReplies: window.IIM_KB.suggestedTopics.slice(0, 4),
      escalate: intentId === "contact_human",
    };
  }

  return { normalize, scoreIntent, classify, respond };
})();
