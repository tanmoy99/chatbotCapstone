/*
 * IIM AI Chatbot — Lexical RAG Retrieval Engine
 *
 * IMPORTANT:
 * - The knowledge base now lives in knowledge.js.
 * - This file reads window.IIM_KB.ragCorpus.
 * - Do not keep a second copy of IIM facts inside rag.js.
 *
 * Current retrieval features:
 * - keyword / phrase matching
 * - query expansion
 * - typo tolerance
 * - lightweight stemming
 * - category boosting
 * - status/trust weighting
 * - confidence scoring
 * - result diversification
 *
 * Public API remains compatible with the existing project:
 *   window.IIM_RAG.retrieve(userText, 4)
 */

window.IIM_RAG = (function () {
  "use strict";

  /* =========================================================
     KNOWLEDGE SOURCE
  ========================================================= */

  function getCorpus() {
    if (
      !window.IIM_KB ||
      !Array.isArray(window.IIM_KB.ragCorpus)
    ) {
      return [];
    }

    return window.IIM_KB.ragCorpus;
  }

  function ensureCorpusAvailable() {
    const corpus = getCorpus();

    if (!corpus.length) {
      console.warn(
        "IIM_RAG: No knowledge corpus found. " +
        "Make sure knowledge.js is loaded before rag.js."
      );
    }

    return corpus;
  }

  /* =========================================================
     SEARCH CONFIGURATION
  ========================================================= */

  const stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "been",
    "but",
    "by",
    "can",
    "could",
    "did",
    "do",
    "does",
    "for",
    "from",
    "had",
    "has",
    "have",
    "how",
    "i",
    "if",
    "in",
    "is",
    "it",
    "its",
    "me",
    "my",
    "of",
    "on",
    "or",
    "our",
    "please",
    "should",
    "tell",
    "that",
    "the",
    "their",
    "there",
    "this",
    "to",
    "us",
    "was",
    "we",
    "were",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "will",
    "with",
    "would",
    "you",
    "your",
    "about",
    "want",
    "need",
    "know",
    "give",
    "show",
  ]);

  /*
   * These words appear in many IIM documents.
   * They receive less weight because they are too general.
   */
  const broadTerms = new Set([
    "iim",
    "information",
    "management",
    "professional",
    "institute",
    "organisation",
    "organization",
    "official",
    "detail",
    "details",
    "requirement",
    "requirements",
    "application",
    "service",
    "services",
    "program",
    "programme",
  ]);

  /*
   * Query expansion.
   *
   * IMPORTANT:
   * We do not force disputed information into the query.
   * For example, "expired" does NOT automatically mean
   * "re-examination".
   */
  const phraseAliases = {
    join: [
      "membership",
      "become a member",
      "membership application",
    ],

    "become member": [
      "membership",
      "join iim",
    ],

    price: [
      "fee",
      "fees",
      "cost",
      "subscription",
    ],

    cost: [
      "fee",
      "fees",
      "price",
      "subscription",
    ],

    pay: [
      "payment",
      "fee",
      "cost",
    ],

    renew: [
      "renewal",
      "maintenance",
      "certificate renewal",
      "recertification",
      "re certification",
    ],

    renewal: [
      "renew",
      "maintenance",
      "recertification",
      "re certification",
    ],

    expire: [
      "expired",
      "expiry",
      "validity",
      "lapsed",
      "reinstatement",
    ],

    expired: [
      "expiry",
      "lapsed",
      "renewal",
      "reinstatement",
    ],

    valid: [
      "validity",
      "duration",
      "expiry",
    ],

    recertification: [
      "re certification",
      "renewal",
      "maintenance",
    ],

    "re certification": [
      "recertification",
      "renewal",
      "maintenance",
    ],

    course: [
      "training",
      "workshop",
      "programme",
      "program",
    ],

    class: [
      "training",
      "course",
      "programme",
      "program",
    ],

    provider: [
      "training provider",
      "accredited training organisation",
      "ato",
    ],

    conference: [
      "event",
      "seminar",
      "workshop",
      "convention",
    ],

    webinar: [
      "event",
      "training",
      "cpd",
    ],

    "talk to someone": [
      "human",
      "staff",
      "contact",
      "representative",
    ],

    "speak to someone": [
      "human",
      "staff",
      "contact",
      "representative",
    ],

    "talk to a person": [
      "human",
      "staff",
      "contact",
      "representative",
    ],

    "phone number": [
      "telephone",
      "contact",
      "call iim",
    ],

    "email address": [
      "email",
      "contact",
      "general enquiries",
    ],

    "data privacy": [
      "data protection",
      "privacy",
      "cdpo",
    ],

    dpo: [
      "cdpo",
      "data protection officer",
    ],

    "certified information manager": [
      "cim",
    ],

    "certified data protection officer": [
      "cdpo",
    ],

    student: [
      "student membership",
      "stiim",
    ],

    graduate: [
      "graduate membership",
      "gmiim",
    ],

    associate: [
      "associate membership",
      "amiim",
    ],

    fellow: [
      "fellow membership",
      "fiim",
    ],

    company: [
      "corporate",
      "organisation",
      "organization",
      "corporate membership",
    ],

    business: [
      "corporate",
      "organisation",
      "organization",
      "corporate membership",
    ],

    office: [
      "location",
      "address",
      "contact",
    ],

    legitimate: [
      "registered",
      "recognised",
      "recognized",
      "approved",
      "licensed",
    ],

    career: [
      "professional relevance",
      "certification",
      "training",
    ],

    "research paper": [
      "publication",
      "journal",
      "research",
    ],
  };

  /*
   * Category detection.
   *
   * These category names must match the categories created
   * by knowledge.js -> ragCorpus.
   */
  const intentRules = [
    {
      category: "Certification",

      terms: [
        "certification",
        "certificate",
        "cdpo",
        "cim",
        "exam",
        "renew",
        "renewal",
        "recertification",
        "re certification",
        "expiry",
        "expired",
        "digital badge",
      ],
    },

    {
      category: "Membership",

      terms: [
        "membership",
        "member",
        "join",
        "subscription",
        "induction",
        "membership fee",
        "stiim",
        "gmiim",
        "amiim",
        "pmiim",
        "spmiim",
        "fiim",
        "cormiim",
      ],
    },

    {
      category: "Professional Development",

      terms: [
        "cpd",
        "mcpd",
        "professional development",
        "cpd points",
        "20 points",
      ],
    },

    {
      category: "Training",

      terms: [
        "training",
        "course",
        "workshop",
        "training provider",
        "ato",
        "accredited training",
      ],
    },

    {
      category: "Certification Verification",

      terms: [
        "verify certificate",
        "certificate verification",
        "digital badge",
        "verify certification",
      ],
    },

    {
      category: "Research and Publications",

      terms: [
        "publication",
        "journal",
        "research",
        "magazine",
        "iim jdim",
        "im world",
      ],
    },

    {
      category: "Consultancy and Services",

      terms: [
        "consultancy",
        "consulting",
        "advisory",
        "retention schedule",
        "information strategy",
        "business process",
      ],
    },

    {
      category: "Privacy and Governance",

      terms: [
        "privacy",
        "personal data",
        "personal information",
        "data rights",
        "data protection",
      ],
    },

    {
      category: "Contact and Support",

      terms: [
        "contact",
        "email",
        "phone",
        "call",
        "human",
        "staff",
        "office",
        "address",
        "abuja",
        "lagos",
        "ibadan",
        "australia",
        "south africa",
      ],
    },

    {
      category: "Events",

      terms: [
        "event",
        "conference",
        "webinar",
        "summit",
        "convention",
        "speaker",
        "venue",
      ],
    },

    {
      category: "About IIM",

      terms: [
        "about iim",
        "mission",
        "vision",
        "headquarters",
        "global presence",
        "legitimate",
        "registered",
        "recognised",
        "recognized",
        "approval",
        "activities",
      ],
    },

    {
      category: "Governance",

      terms: [
        "current",
        "latest",
        "today",
        "live",
        "dynamic",
        "verification",
      ],
    },
  ];

  /*
   * Knowledge status trust level.
   *
   * stable
   * Normal knowledge.
   *
   * dynamic
   * Correct at review date but can change.
   *
   * verify
   * Conflicting information or client confirmation required.
   *
   * live
   * Should preferably be checked on the live IIM website.
   */
  const statusMultipliers = {
    stable: 1,
    dynamic: 0.96,
    verify: 0.72,
    live: 0.82,
  };

  const currentQueryTerms = [
    "current",
    "currently",
    "latest",
    "today",
    "now",
    "up to date",
    "up-to-date",
    "next event",
    "upcoming",
    "available now",
  ];

  /* =========================================================
     NORMALISE TEXT
  ========================================================= */

  function normalize(text) {
    return String(text || "")
      .toLowerCase()

      .replace(
        /[®™©]/g,
        ""
      )

      .replace(
        /\bwhat's\b/g,
        "what is"
      )

      .replace(
        /\bwho's\b/g,
        "who is"
      )

      .replace(
        /\bcan't\b/g,
        "cannot"
      )

      .replace(
        /\bdon't\b/g,
        "do not"
      )

      .replace(
        /\bdoesn't\b/g,
        "does not"
      )

      .replace(
        /\bisn't\b/g,
        "is not"
      )

      .replace(
        /\baren't\b/g,
        "are not"
      )

      .replace(
        /\bwasn't\b/g,
        "was not"
      )

      .replace(
        /\bweren't\b/g,
        "were not"
      )

      .replace(
        /\bi'm\b/g,
        "i am"
      )

      .replace(
        /\bthey're\b/g,
        "they are"
      )

      .replace(
        /\bwon't\b/g,
        "will not"
      )

      .replace(
        /[^a-z0-9\s]/g,
        " "
      )

      .replace(
        /\s+/g,
        " "
      )

      .trim();
  }

  /* =========================================================
     LIGHT STEMMING
  ========================================================= */

  function stem(token) {
    let value = token;

    if (
      value.length > 5 &&
      value.endsWith("ies")
    ) {
      value =
        value.slice(
          0,
          -3
        ) + "y";
    } else if (
      value.length > 5 &&
      value.endsWith("ing")
    ) {
      value =
        value.slice(
          0,
          -3
        );
    } else if (
      value.length > 4 &&
      value.endsWith("ed")
    ) {
      value =
        value.slice(
          0,
          -2
        );
    } else if (
      value.length > 4 &&
      value.endsWith("es")
    ) {
      value =
        value.slice(
          0,
          -2
        );
    } else if (
      value.length > 3 &&
      value.endsWith("s")
    ) {
      value =
        value.slice(
          0,
          -1
        );
    }

    return value;
  }

  function getTokens(text) {
    return normalize(text)

      .split(" ")

      .filter(Boolean)

      .filter(
        (token) =>
          token.length > 1
      )

      .filter(
        (token) =>
          !stopWords.has(
            token
          )
      )

      .map(stem);
  }

  /* =========================================================
     TYPO TOLERANCE
  ========================================================= */

  function editDistance(
    firstWord,
    secondWord
  ) {
    if (
      firstWord ===
      secondWord
    ) {
      return 0;
    }

    if (
      !firstWord.length
    ) {
      return secondWord.length;
    }

    if (
      !secondWord.length
    ) {
      return firstWord.length;
    }

    const previous =
      Array.from(
        {
          length:
            secondWord.length +
            1,
        },

        (_, index) =>
          index
      );

    const current =
      new Array(
        secondWord.length +
        1
      );

    for (
      let i = 1;
      i <=
      firstWord.length;
      i++
    ) {
      current[0] = i;

      for (
        let j = 1;
        j <=
        secondWord.length;
        j++
      ) {
        const cost =
          firstWord[i - 1] ===
          secondWord[j - 1]
            ? 0
            : 1;

        current[j] =
          Math.min(
            current[j - 1] +
              1,

            previous[j] +
              1,

            previous[j - 1] +
              cost
          );
      }

      for (
        let j = 0;
        j <=
        secondWord.length;
        j++
      ) {
        previous[j] =
          current[j];
      }
    }

    return previous[
      secondWord.length
    ];
  }

  function tokenSimilarity(
    firstToken,
    secondToken
  ) {
    if (
      firstToken ===
      secondToken
    ) {
      return 1;
    }

    if (
      firstToken.length < 4 ||
      secondToken.length < 4
    ) {
      return 0;
    }

    const distance =
      editDistance(
        firstToken,
        secondToken
      );

    const longest =
      Math.max(
        firstToken.length,
        secondToken.length
      );

    return (
      1 -
      distance / longest
    );
  }

  function fuzzyTokenMatch(
    queryToken,
    candidateTokens
  ) {
    let bestSimilarity = 0;

    for (
      const candidateToken
      of candidateTokens
    ) {
      if (
        queryToken ===
        candidateToken
      ) {
        return 1;
      }

      const similarity =
        tokenSimilarity(
          queryToken,
          candidateToken
        );

      if (
        similarity >
        bestSimilarity
      ) {
        bestSimilarity =
          similarity;
      }
    }

    return bestSimilarity;
  }

  /* =========================================================
     QUERY EXPANSION
  ========================================================= */

  function expandQuery(query) {
    const normalizedQuery =
      normalize(query);

    const additions = [];

    for (
      const [
        phrase,
        aliases,
      ]
      of Object.entries(
        phraseAliases
      )
    ) {
      if (
        normalizedQuery.includes(
          normalize(
            phrase
          )
        )
      ) {
        additions.push(
          ...aliases
        );
      }
    }

    return normalize(
      [
        normalizedQuery,
        ...additions,
      ].join(" ")
    );
  }

  /* =========================================================
     CURRENT / LIVE INFORMATION DETECTION
  ========================================================= */

  function isCurrentInformationQuery(
    query
  ) {
    const normalizedQuery =
      normalize(query);

    return currentQueryTerms.some(
      (term) =>
        normalizedQuery.includes(
          normalize(term)
        )
    );
  }

  /* =========================================================
     CATEGORY DETECTION
  ========================================================= */

  function detectCategoryBoosts(
    query
  ) {
    const normalizedQuery =
      normalize(query);

    const boosts =
      new Map();

    for (
      const rule
      of intentRules
    ) {
      const matchingTerms =
        rule.terms.filter(
          (term) =>
            normalizedQuery.includes(
              normalize(
                term
              )
            )
        );

      if (
        matchingTerms.length >
        0
      ) {
        boosts.set(
          rule.category,

          7 +
            matchingTerms.length *
              3
        );
      }
    }

    return boosts;
  }

  /* =========================================================
     DOCUMENT STATUS
  ========================================================= */

  function getStatus(
    document
  ) {
    return String(
      document.status ||
        "stable"
    ).toLowerCase();
  }

  function getStatusMultiplier(
    document
  ) {
    const status =
      getStatus(
        document
      );

    return (
      statusMultipliers[
        status
      ] || 0.9
    );
  }

  function requiresVerification(
    document,
    query
  ) {
    const status =
      getStatus(
        document
      );

    /*
     * Always verify conflicting
     * or live information.
     */
    if (
      status === "verify" ||
      status === "live"
    ) {
      return true;
    }

    /*
     * Dynamic information only
     * needs an explicit warning
     * when the user is asking for
     * CURRENT information.
     */
    if (
      status === "dynamic" &&
      isCurrentInformationQuery(
        query
      )
    ) {
      return true;
    }

    return false;
  }

  /* =========================================================
     COUNT WORD OCCURRENCES
  ========================================================= */

  function countOccurrences(
    text,
    searchTerm
  ) {
    if (
      !text ||
      !searchTerm
    ) {
      return 0;
    }

    let count = 0;

    let position = 0;

    while (true) {
      position =
        text.indexOf(
          searchTerm,
          position
        );

      if (
        position === -1
      ) {
        break;
      }

      count += 1;

      position +=
        searchTerm.length;
    }

    return count;
  }

  /* =========================================================
     DOCUMENT SCORING
  ========================================================= */

  function scoreDocument(
    originalQuery,
    normalizedQuery,
    queryTokens,
    document,
    categoryBoosts
  ) {
    const normalizedTitle =
      normalize(
        document.title
      );

    const normalizedText =
      normalize(
        document.text
      );

    const normalizedKeywords =
      (
        document.keywords ||
        []
      ).map(
        normalize
      );

    const titleTokens =
      getTokens(
        normalizedTitle
      );

    const keywordTokens =
      getTokens(
        normalizedKeywords.join(
          " "
        )
      );

    const textTokens =
      getTokens(
        normalizedText
      );

    const allDocumentTokens =
      [
        ...new Set(
          [
            ...titleTokens,
            ...keywordTokens,
            ...textTokens,
          ]
        ),
      ];

    let score = 0;

    let exactMeaningfulMatches =
      0;

    let fuzzyMatches =
      0;

    const matchedTerms =
      new Set();

    /* =====================================================
       STRONG KEYWORD / PHRASE MATCHING
    ===================================================== */

    for (
      const keyword
      of normalizedKeywords
    ) {
      if (
        !keyword
      ) {
        continue;
      }

      if (
        normalizedQuery ===
        keyword
      ) {
        score +=
          keyword.includes(
            " "
          )
            ? 42
            : 28;

        exactMeaningfulMatches +=
          1;

        matchedTerms.add(
          keyword
        );
      } else if (
        normalizedQuery.includes(
          keyword
        )
      ) {
        score +=
          keyword.includes(
            " "
          )
            ? 24
            : 12;

        exactMeaningfulMatches +=
          1;

        matchedTerms.add(
          keyword
        );
      } else if (
        keyword.includes(
          normalizedQuery
        ) &&
        normalizedQuery.length >=
          4
      ) {
        score += 10;
      }
    }

    /* =====================================================
       TITLE MATCHING
    ===================================================== */

    if (
      normalizedQuery ===
      normalizedTitle
    ) {
      score += 45;
    } else if (
      normalizedQuery.includes(
        normalizedTitle
      ) &&
      normalizedTitle.length >
        4
    ) {
      score += 24;
    }

    /* =====================================================
       CATEGORY BOOST
    ===================================================== */

    score +=
      categoryBoosts.get(
        document.category
      ) || 0;

    /* =====================================================
       TOKEN MATCHING
    ===================================================== */

    for (
      const token
      of queryTokens
    ) {
      const isBroad =
        broadTerms.has(
          token
        );

      let matched =
        false;

      /*
       * Title token.
       */
      if (
        titleTokens.includes(
          token
        )
      ) {
        score +=
          isBroad
            ? 2
            : 9;

        matched = true;
      }

      /*
       * Keyword token.
       */
      if (
        keywordTokens.includes(
          token
        )
      ) {
        score +=
          isBroad
            ? 2
            : 8;

        matched = true;
      }

      /*
       * Main document text.
       */
      const textOccurrences =
        countOccurrences(
          normalizedText,
          token
        );

      if (
        textOccurrences >
        0
      ) {
        score +=
          isBroad
            ? Math.min(
                textOccurrences,
                2
              )
            : Math.min(
                textOccurrences,
                4
              ) * 2.5;

        matched = true;
      }

      /*
       * Exact match found.
       */
      if (
        matched
      ) {
        if (
          !isBroad
        ) {
          exactMeaningfulMatches +=
            1;
        }

        matchedTerms.add(
          token
        );
      } else if (
        !isBroad &&
        token.length >=
          4
      ) {
        /*
         * Typo tolerant match.
         */
        const similarity =
          fuzzyTokenMatch(
            token,
            allDocumentTokens
          );

        if (
          similarity >=
          0.82
        ) {
          score +=
            similarity >=
            0.9
              ? 5
              : 3;

          fuzzyMatches +=
            1;

          matchedTerms.add(
            token
          );
        }
      }
    }

    /* =====================================================
       MULTI-TERM MATCH REWARD
    ===================================================== */

    const uniqueMeaningfulMatches =
      [
        ...matchedTerms,
      ].filter(
        (term) =>
          !broadTerms.has(
            term
          ) &&
          !stopWords.has(
            term
          )
      ).length;

    if (
      uniqueMeaningfulMatches >=
      2
    ) {
      score +=
        uniqueMeaningfulMatches *
        5;
    }

    if (
      uniqueMeaningfulMatches >=
      3
    ) {
      score += 10;
    }

    if (
      uniqueMeaningfulMatches >=
      4
    ) {
      score += 8;
    }

    /* =====================================================
       REJECT GENERIC-ONLY MATCHES
    ===================================================== */

    if (
      exactMeaningfulMatches ===
        0 &&
      fuzzyMatches === 0
    ) {
      return 0;
    }

    /* =====================================================
       WEAK LONG QUERY PENALTY
    ===================================================== */

    if (
      queryTokens.length >=
        2 &&
      uniqueMeaningfulMatches ===
        1
    ) {
      score *=
        0.62;
    }

    /* =====================================================
       KNOWLEDGE STATUS WEIGHT
    ===================================================== */

    score *=
      getStatusMultiplier(
        document
      );

    /*
     * Backwards compatibility
     * if verified:false is used.
     */
    if (
      document.verified ===
      false
    ) {
      score *= 0.9;
    }

    /*
     * High-precision lifecycle boost.
     *
     * Query expansion can make a broad CDPO overview score
     * highly for an expiry question. When both the entity and
     * lifecycle state are explicit in the original question,
     * prefer the matching policy document while preserving its
     * verification warning.
     */
    const expiryQuestion =
      originalQuery.includes("cdpo") &&
      [
        "expire",
        "expired",
        "expires",
        "expiry",
        "lapsed",
      ].some(
        (term) =>
          originalQuery.includes(
            term
          )
      );

    if (
      expiryQuestion &&
      document.id ===
        "cdpo_expired_policy"
    ) {
      score += 180;
    }

    return (
      Math.round(
        score * 100
      ) / 100
    );
  }

  /* =========================================================
     CONFIDENCE SCORE
  ========================================================= */

  function calculateConfidence(
    topScore,
    secondScore,
    queryTokenCount
  ) {
    if (
      topScore <= 0
    ) {
      return 0;
    }

    /*
     * How strong is the
     * absolute top score?
     */
    const absoluteConfidence =
      Math.min(
        topScore / 55,
        1
      );

    /*
     * How far ahead is the
     * top result?
     */
    const scoreMargin =
      secondScore > 0
        ? Math.min(
            (
              topScore -
              secondScore
            ) /
              Math.max(
                topScore,
                1
              ),
            1
          )
        : 1;

    /*
     * Very short queries
     * are naturally less certain.
     */
    const queryFactor =
      Math.min(
        Math.max(
          queryTokenCount,
          1
        ) / 3,
        1
      );

    return Math.max(
      0,

      Math.min(
        1,

        absoluteConfidence *
          0.65 +

        scoreMargin *
          0.25 +

        queryFactor *
          0.1
      )
    );
  }

  /* =========================================================
     DIVERSIFY RESULTS
  ========================================================= */

  function diversify(
    results,
    limit
  ) {
    const selected =
      [];

    const categoryCounts =
      new Map();

    for (
      const result
      of results
    ) {
      const currentCount =
        categoryCounts.get(
          result.category
        ) || 0;

      /*
       * Maximum 3 documents
       * from the same category.
       *
       * Useful for things like
       * CDPO renewal where
       * several related chunks
       * may be needed.
       */
      if (
        currentCount >=
        3
      ) {
        continue;
      }

      selected.push(
        result
      );

      categoryCounts.set(
        result.category,
        currentCount + 1
      );

      if (
        selected.length >=
        limit
      ) {
        break;
      }
    }

    return selected;
  }

  /* =========================================================
     MAIN RETRIEVAL FUNCTION
  ========================================================= */

  function retrieve(
    query,
    k
  ) {
    const corpus =
      ensureCorpusAvailable();

    /*
     * knowledge.js missing
     * or empty.
     */
    if (
      !corpus.length
    ) {
      return [];
    }

    /*
     * Default to 4 results.
     */
    const limit =
      Number.isInteger(
        k
      ) &&
      k > 0
        ? k
        : 4;

    /*
     * Add useful synonyms.
     */
    const expandedQuery =
      expandQuery(
        query
      );

    const originalQuery =
      normalize(
        query
      );

    if (
      !expandedQuery
    ) {
      return [];
    }

    /*
     * Searchable words.
     */
    const queryTokens =
      [
        ...new Set(
          getTokens(
            expandedQuery
          )
        ),
      ];

    if (
      !queryTokens.length
    ) {
      return [];
    }

    /*
     * Detect likely subject.
     */
    const categoryBoosts =
      detectCategoryBoosts(
        expandedQuery
      );

    /*
     * Score all knowledge chunks.
     */
    const rankedDocuments =
      corpus

        .map(
          (document) => ({
            ...document,

            score:
              scoreDocument(
                originalQuery,
                expandedQuery,
                queryTokens,
                document,
                categoryBoosts
              ),
          })
        )

        .filter(
          (document) =>
            document.score >
            0
        )

        .sort(
          (
            first,
            second
          ) => {
            /*
             * Highest score first.
             */
            if (
              second.score !==
              first.score
            ) {
              return (
                second.score -
                first.score
              );
            }

            /*
             * Prefer verified
             * knowledge if scores
             * are equal.
             */
            if (
              Number(
                second.verified
              ) !==
              Number(
                first.verified
              )
            ) {
              return (
                Number(
                  second.verified
                ) -
                Number(
                  first.verified
                )
              );
            }

            return (
              first.title.localeCompare(
                second.title
              )
            );
          }
        );

    if (
      !rankedDocuments.length
    ) {
      return [];
    }

    const topScore =
      rankedDocuments[0]
        .score;

    const secondScore =
      rankedDocuments[1]
        ? rankedDocuments[1]
            .score
        : 0;

    const confidence =
      calculateConfidence(
        topScore,
        secondScore,
        queryTokens.length
      );

    /*
     * Short queries need
     * stronger evidence.
     */
    let minimumScore =
      queryTokens.length <=
      1
        ? 11
        : 7;

    /*
     * Increase threshold
     * if retrieval confidence
     * is already weak.
     */
    if (
      confidence <
      0.28
    ) {
      minimumScore +=
        3;
    }

    /*
     * Keep only meaningful
     * results.
     */
    const acceptedDocuments =
      rankedDocuments

        .filter(
          (document) =>
            document.score >=
            minimumScore
        )

        .filter(
          (document) =>
            document.score >=
            topScore *
              0.34
        )

        .map(
          (
            document,
            index
          ) => ({
            ...document,

            rank:
              index + 1,

            confidence:
              index === 0
                ? confidence
                : Math.max(
                    0,

                    Math.min(
                      1,

                      confidence *
                        (
                          document.score /
                          topScore
                        )
                    )
                  ),

            /*
             * app.js/server.js can
             * later use this flag
             * to add a warning.
             */
            requiresVerification:
              requiresVerification(
                document,
                query
              ),
          })
        );

    return diversify(
      acceptedDocuments,
      limit
    );
  }

  /* =========================================================
     RETRIEVAL WITH DIAGNOSTICS
  ========================================================= */

  function retrieveWithMeta(
    query,
    k
  ) {
    const results =
      retrieve(
        query,
        k
      );

    const topResult =
      results[0] ||
      null;

    const currentInformation =
      isCurrentInformationQuery(
        query
      );

    const verificationNeeded =
      results.some(
        (result) =>
          result.requiresVerification
      );

    return {
      /*
       * Original question.
       */
      query,

      /*
       * Question after synonyms
       * are added.
       */
      normalizedQuery:
        expandQuery(
          query
        ),

      /*
       * Retrieved chunks.
       */
      results,

      /*
       * Highest lexical score.
       */
      topScore:
        topResult
          ? topResult.score
          : 0,

      /*
       * Estimated retrieval
       * confidence.
       */
      confidence:
        topResult
          ? topResult.confidence
          : 0,

      /*
       * Useful later for deciding
       * whether to call Llama
       * or use fallback.
       */
      hasReliableMatch:
        Boolean(
          topResult &&
          topResult.confidence >=
            0.45 &&
          topResult.score >=
            18
        ),

      /*
       * Did the user explicitly
       * ask for current/latest info?
       */
      currentInformationQuery:
        currentInformation,

      /*
       * Does any selected chunk
       * require caution?
       */
      requiresVerification:
        verificationNeeded,

      /*
       * Diagnostic warning.
       */
      warning:
        verificationNeeded
          ? (
              "One or more retrieved items are dynamic, live, " +
              "or marked for verification. Preserve the caution " +
              "in the source and do not present uncertain " +
              "information as confirmed."
            )
          : "",
    };
  }

  /* =========================================================
     GET DOCUMENT BY ID
  ========================================================= */

  function getDocumentById(
    id
  ) {
    return (
      getCorpus().find(
        (document) =>
          document.id ===
          id
      ) ||
      null
    );
  }

  /* =========================================================
     GET DOCUMENTS BY CATEGORY
  ========================================================= */

  function getDocumentsByCategory(
    category
  ) {
    const normalizedCategory =
      normalize(
        category
      );

    return (
      getCorpus().filter(
        (document) =>
          normalize(
            document.category
          ) ===
          normalizedCategory
      )
    );
  }

  /* =========================================================
     CORPUS STATISTICS
  ========================================================= */

  function getCorpusStats() {
    const corpus =
      getCorpus();

    const statusCounts =
      {};

    for (
      const document
      of corpus
    ) {
      const status =
        getStatus(
          document
        );

      statusCounts[
        status
      ] =
        (
          statusCounts[
            status
          ] ||
          0
        ) + 1;
    }

    return {
      totalDocuments:
        corpus.length,

      verifiedDocuments:
        corpus.filter(
          (document) =>
            document.verified !==
            false
        ).length,

      unverifiedDocuments:
        corpus.filter(
          (document) =>
            document.verified ===
            false
        ).length,

      statusCounts,

      categories:
        [
          ...new Set(
            corpus.map(
              (document) =>
                document.category
            )
          ),
        ],
    };
  }

  /* =========================================================
     PUBLIC API
  ========================================================= */

  return {
    /*
     * This getter means
     * IIM_RAG.corpus always reads
     * the current knowledge.js data.
     */
    get corpus() {
      return getCorpus();
    },

    normalize,

    getTokens,

    expandQuery,

    retrieve,

    retrieveWithMeta,

    getDocumentById,

    getDocumentsByCategory,

    getCorpusStats,

    isCurrentInformationQuery,
  };
})();