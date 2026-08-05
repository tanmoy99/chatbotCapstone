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

  function respond(text) {
    const result = classify(text, window.IIM_KB.intents);
    const r = result.intent.respond(text, result);
    return Object.assign({ intentId: result.intent.id, score: result.score, confident: result.confident }, r);
  }

  return { normalize, scoreIntent, classify, respond };
})();
