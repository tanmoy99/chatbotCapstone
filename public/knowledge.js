"use strict";

/*
 * IIM Chatbot — Knowledge Base Loader
 *
 * Editable IIM content is stored in data/knowledge-base.json.
 * The server exposes that file to the browser as knowledge-data.js and also
 * loads it directly for Node.js. This file validates the supplied data and
 * builds the RAG-ready corpus expected by the existing chatbot.
 */

(function initialiseKnowledgeBase(root) {
  const data = root.IIM_KB_DATA;

  if (!data || typeof data !== "object") {
    throw new Error(
      "IIM knowledge data was not loaded. Load knowledge-data.js before knowledge.js."
    );
  }

  const documents = Array.isArray(data.documents)
    ? data.documents
    : [];

  if (documents.length === 0) {
    throw new Error(
      "IIM knowledge data does not contain any documents."
    );
  }

  const allowedStatuses = new Set([
    "stable",
    "dynamic",
    "verify",
    "live",
  ]);

  const documentIds = new Set();

  documents.forEach((document, index) => {
    const position = index + 1;

    if (!document || typeof document !== "object") {
      throw new Error(
        `Knowledge document ${position} must be an object.`
      );
    }

    [
      "id",
      "scope",
      "category",
      "title",
      "status",
      "lastReviewed",
      "text",
      "source",
    ].forEach((field) => {
      if (
        typeof document[field] !== "string" ||
        document[field].trim() === ""
      ) {
        throw new Error(
          `Knowledge document ${position} is missing ${field}.`
        );
      }
    });

    if (documentIds.has(document.id)) {
      throw new Error(
        `Duplicate knowledge document ID: ${document.id}`
      );
    }

    documentIds.add(document.id);

    if (!allowedStatuses.has(document.status)) {
      throw new Error(
        `Knowledge document ${document.id} has an invalid status.`
      );
    }

    if (!Array.isArray(document.keywords)) {
      throw new Error(
        `Knowledge document ${document.id} must contain a keywords array.`
      );
    }
  });

  const groundedResponses =
    data.groundedResponses &&
    typeof data.groundedResponses === "object" &&
    !Array.isArray(data.groundedResponses)
      ? data.groundedResponses
      : {};

  Object.entries(
    groundedResponses
  ).forEach(
    ([responseId, response]) => {
      if (
        !response ||
        typeof response !== "object"
      ) {
        throw new Error(
          `Grounded response ${responseId} must be an object.`
        );
      }

      if (
        typeof response.sourceId !== "string" ||
        !documentIds.has(response.sourceId)
      ) {
        throw new Error(
          `Grounded response ${responseId} refers to an unknown source ID.`
        );
      }

      if (
        typeof response.answer !== "string" ||
        response.answer.trim() === ""
      ) {
        throw new Error(
          `Grounded response ${responseId} is missing its approved answer.`
        );
      }
    }
  );

  const categoryLabels = {
    about: "About IIM",
    approvals: "About IIM",
    membership: "Membership",
    certification: "Certification",
    cdpo: "Certification",
    cpd: "Professional Development",
    training: "Training",
    verification: "Certification Verification",
    resources: "Research and Publications",
    services: "Consultancy and Services",
    privacy: "Privacy and Governance",
    contact: "Contact and Support",
    events: "Events",
    governance: "Governance",
  };

  const ragCorpus = documents.map((entry) => ({
    id: entry.id,
    title: entry.title,
    category:
      categoryLabels[entry.category] ||
      entry.category,
    source: "IIM official website",
    sourceUrl: entry.source || "",
    secondarySourceUrl:
      entry.secondarySource ||
      entry.liveListSource ||
      "",
    verified: entry.status !== "verify",
    status: entry.status,
    scope: entry.scope,
    lastReviewed: entry.lastReviewed,
    keywords: entry.keywords || [],
    text: entry.text,
  }));

  root.IIM_KB = {
    org: data.organization || {},
    contacts: data.contacts || {},
    sources: data.sources || {},
    knowledge: documents,
    ragCorpus,
    personas: Array.isArray(data.personas)
      ? data.personas
      : [],
    suggestedTopics: Array.isArray(
      data.suggestedTopics
    )
      ? data.suggestedTopics
      : [],
    intents: Array.isArray(data.intents)
      ? data.intents
      : [],
    journeys: Array.isArray(data.journeys)
      ? data.journeys
      : [],
    groundedResponses,
    lastReviewed: data.lastReviewed || "",
    version: data.knowledgeBaseVersion || "",
  };
})(
  typeof window !== "undefined"
    ? window
    : globalThis
);
