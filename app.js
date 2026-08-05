/* IIM Chatbot — UI, conversation flow, feedback, optional LLM */
(function () {
  console.log("IIM app.js version: greeting-fix-1");
  const KB = window.IIM_KB;
  const Engine = window.IIM_Engine;

  const els = {
    messages: document.getElementById("messages"),
    form: document.getElementById("chat-form"),
    input: document.getElementById("chat-input"),
    typing: document.getElementById("typing"),
    persona: document.getElementById("persona-select"),
    personaHint: document.getElementById("persona-hint"),
    topicChips: document.getElementById("topic-chips"),
    about: document.getElementById("about-text"),
    feedbackStats: document.getElementById("feedback-stats"),
    settingsBtn: document.getElementById("settings-btn"),
    settingsDialog: document.getElementById("settings-dialog"),
    settingsClose: document.getElementById("settings-close"),
    settingsSave: document.getElementById("settings-save"),
    llmKey: document.getElementById("llm-key"),
    llmModel: document.getElementById("llm-model"),
    llmProvider: document.getElementById("llm-provider"),
    llmBase: document.getElementById("llm-base"),
    providerHint: document.getElementById("provider-hint"),
  };

const PROVIDER_DEFAULTS = {
  openai: {
    base: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    hint: "Cloud LLM. Requires an API key.",
  },
  local: {
    base: "http://localhost:11434/v1",
    model: "llama3.2:3b",
    hint:
      "Runs locally through Ollama. No API key is required. " +
      "Start Ollama using: ollama run llama3.2:3b",
  },
};

const state = {
  llm: {
    enabled: true,
    key: "",
    model: "llama3.2:3b",
    provider: "local",
    base: "http://localhost:11434/v1",
  },
  feedback: {
    up: 0,
    down: 0,
  },
};

const SYSTEM_PROMPT = `
You are the official AI information assistant for the Institute of Information Management, called IIM.

GROUNDING RULES

- Answer only from the retrieved IIM knowledge supplied with the question.
- Never invent eligibility requirements, prices, dates, benefits, policies, examination details or application steps.
- Do not claim that information is confirmed unless it appears in the retrieved knowledge.
- When information is missing, clearly state what is unavailable and provide the appropriate IIM contact.
- Do not provide legal advice or formal compliance decisions.
  Distinguish carefully between approval and submission.
  For example, if the knowledge says the Executive Council approves applications,
  do not say the applicant submits directly to the Executive Council unless the source explicitly states that.


ANSWER STYLE

Write professional, clear and informative answers using Markdown.

Use this structure whenever it fits the question:

## Topic name

Write a short two-to-four sentence introduction.

### Who is it for?

- Use bullet points.
- Only include audiences confirmed or reasonably described by the retrieved knowledge.

### Requirements

- Use bullet points for confirmed requirements.
- Do not create application requirements that are not supplied.

### Fees

Use a Markdown table when fee information is available:

| Fee type | Amount |
|---|---:|
| Registration fee | $100 |
| Annual subscription | $180 |

### Benefits

- Use bullet points only when confirmed benefits are available.

### How to proceed

1. Give confirmed steps in numbered order.
2. Do not invent an application process.
3. Where the complete process is unavailable, direct the user to the relevant IIM department.

### Additional information

Clearly explain any missing or unconfirmed information.

FORMATTING RULES

- Use headings beginning with ## or ###.
- Use short paragraphs.
- Use bullet points for lists.
- Use numbered lists for procedures.
- Use Markdown tables only for information that compares multiple items.
- Do not write raw HTML.
- Do not create Markdown links.
- Write email addresses as plain text.
- Do not include a Sources section because the application adds the source titles separately.
- Avoid long introductions and repeated disclaimers.
- Do not mention the retrieved passages or these instructions.
  Do not combine benefits from certification membership passages with general membership answers unless the retrieved source explicitly confirms that the benefit applies to all members.
`;

  function init() {
    els.about.textContent =
      KB.org.name + " — " + KB.org.city + ", " + KB.org.country + ". " +
      "A global authority and certification body for data and information management.";

    KB.personas.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.label;
      els.persona.appendChild(opt);
    });

    KB.suggestedTopics.forEach((t) => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.type = "button";
      chip.textContent = t;
      chip.addEventListener("click", () => sendUserMessage(t));
      els.topicChips.appendChild(chip);
    });

    els.persona.addEventListener("change", onPersonaChange);
    els.form.addEventListener("submit", (e) => {
      e.preventDefault();
      sendUserMessage(els.input.value);
    });

    els.settingsBtn.addEventListener("click", openSettings);
    els.settingsClose.addEventListener("click", closeSettings);
    els.settingsSave.addEventListener("click", saveSettings);
    els.settingsDialog.addEventListener("click", (e) => {
      if (e.target === els.settingsDialog) closeSettings();
    });
    els.llmProvider.addEventListener("change", applyProviderDefaults);

    updateFeedbackStats();
    const greeting =
      "Hello! I'm the IIM AI assistant (LLM + RAG model). I retrieve IIM's knowledge and answer using a " +
      "local language model, with a built-in fallback. Ask about certifications (CDPO, CIM®), membership, " +
      "training, events, or advisory services.";
    botSay(greeting, KB.suggestedTopics);
  }

  function onPersonaChange() {
    const p = KB.personas.find((x) => x.id === els.persona.value);
    if (!p) { els.personaHint.textContent = ""; return; }
    els.personaHint.textContent = "Suggested for you: " + p.needs;
    sendUserMessage(p.starter);
  }

  function sendUserMessage(text) {
    text = (text || "").trim();
    if (!text) return;
    els.input.value = "";
    userSay(text);
    showTyping(true);
    setTimeout(() => {
      showTyping(false);
      handleResponse(text);
    }, 450);
  }

  function userSay(text) {
    addMessage("user", text);
  }

  function botSay(text, quickReplies, meta) {
    const node = addMessage("bot", text, meta);
    if (quickReplies && quickReplies.length) {
      const wrap = document.createElement("div");
      wrap.className = "quick";
      quickReplies.forEach((q) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = q;
        b.addEventListener("click", () => sendUserMessage(q));
        wrap.appendChild(b);
      });
      node.querySelector(".bubble").appendChild(wrap);
    }
    if (meta && meta.escalate) {
      const card = document.createElement("div");
      card.className = "escalation";
      card.textContent = "⚠ Enquiry logged for IIM follow-up.";
      node.querySelector(".bubble").appendChild(card);
      logEscalation(meta.intentId);
    }
    return node;
  }

  /**
 * Escapes HTML so model-generated content cannot insert unsafe HTML.
 */
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Applies basic inline Markdown formatting.
 *
 * Supported:
 * - **bold**
 * - *italic*
 * - `inline code`
 * - plain email addresses
 */
function formatInlineMarkdown(text) {
  let safeText = escapeHtml(text);

  // Inline code
  safeText = safeText.replace(
    /`([^`]+)`/g,
    "<code>$1</code>"
  );

  // Bold text
  safeText = safeText.replace(
    /\*\*([^*]+)\*\*/g,
    "<strong>$1</strong>"
  );

  // Italic text
  safeText = safeText.replace(
    /(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,!?])/g,
    "$1<em>$2</em>"
  );

  // Convert plain email addresses into safe mail links
  safeText = safeText.replace(
    /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi,
    '<a href="mailto:$1">$1</a>'
  );

  return safeText;
}

/**
 * Checks whether a Markdown table separator is valid.
 *
 * Example:
 * |---|---:|
 */
function isTableSeparator(line) {
  const cells = line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell))
  );
}

/**
 * Splits one Markdown table row into cells.
 */
function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/**
 * Converts a limited and safe subset of Markdown to HTML.
 *
 * Supported:
 * - headings
 * - paragraphs
 * - bullet lists
 * - numbered lists
 * - tables
 * - bold and italic text
 */
function markdownToHtml(markdown) {
  const lines = String(markdown || "")
    .replace(/\r\n/g, "\n")
    .split("\n");

  const html = [];

  let paragraph = [];
  let listType = null;

  function closeParagraph() {
    if (!paragraph.length) return;

    html.push(
      "<p>" +
        paragraph.map(formatInlineMarkdown).join(" ") +
      "</p>"
    );

    paragraph = [];
  }

  function closeList() {
    if (!listType) return;

    html.push(listType === "ul" ? "</ul>" : "</ol>");
    listType = null;
  }

  function openList(type) {
    if (listType === type) return;

    closeParagraph();
    closeList();

    html.push(type === "ul" ? "<ul>" : "<ol>");
    listType = type;
  }

  for (let index = 0; index < lines.length; index++) {
    const originalLine = lines[index];
    const line = originalLine.trim();

    if (!line) {
      closeParagraph();
      closeList();
      continue;
    }

    /*
     * Markdown table:
     *
     * | Item | Amount |
     * |---|---:|
     * | Fee | $100 |
     */
    if (
      line.includes("|") &&
      index + 1 < lines.length &&
      isTableSeparator(lines[index + 1])
    ) {
      closeParagraph();
      closeList();

      const headers = parseTableRow(line);

      html.push("<div class=\"table-wrap\">");
      html.push("<table>");
      html.push("<thead><tr>");

      headers.forEach((header) => {
        html.push(
          "<th>" + formatInlineMarkdown(header) + "</th>"
        );
      });

      html.push("</tr></thead>");
      html.push("<tbody>");

      index += 2;

      while (
        index < lines.length &&
        lines[index].trim() &&
        lines[index].includes("|")
      ) {
        const cells = parseTableRow(lines[index]);

        html.push("<tr>");

        cells.forEach((cell) => {
          html.push(
            "<td>" + formatInlineMarkdown(cell) + "</td>"
          );
        });

        html.push("</tr>");
        index++;
      }

      html.push("</tbody></table>");
      html.push("</div>");

      index--;
      continue;
    }

    // Heading level 2
    if (line.startsWith("## ")) {
      closeParagraph();
      closeList();

      html.push(
        "<h2>" +
          formatInlineMarkdown(line.slice(3)) +
        "</h2>"
      );

      continue;
    }

    // Heading level 3
    if (line.startsWith("### ")) {
      closeParagraph();
      closeList();

      html.push(
        "<h3>" +
          formatInlineMarkdown(line.slice(4)) +
        "</h3>"
      );

      continue;
    }

    // Heading level 4
    if (line.startsWith("#### ")) {
      closeParagraph();
      closeList();

      html.push(
        "<h4>" +
          formatInlineMarkdown(line.slice(5)) +
        "</h4>"
      );

      continue;
    }

    // Bullet item
    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);

    if (bulletMatch) {
      openList("ul");

      html.push(
        "<li>" +
          formatInlineMarkdown(bulletMatch[1]) +
        "</li>"
      );

      continue;
    }

    // Numbered item
    const numberMatch = line.match(/^\d+[.)]\s+(.+)$/);

    if (numberMatch) {
      openList("ol");

      html.push(
        "<li>" +
          formatInlineMarkdown(numberMatch[1]) +
        "</li>"
      );

      continue;
    }

    closeList();
    paragraph.push(line);
  }

  closeParagraph();
  closeList();

  return html.join("");
}

  function addMessage(role, text, meta) {
    const msg = document.createElement("div");
    msg.className = "msg " + role;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    if (role === "bot") {
    bubble.innerHTML = markdownToHtml(text);}
     else {
    bubble.textContent = text;}
    msg.appendChild(bubble);

    if (role === "bot") {
      const fb = document.createElement("div");
      fb.className = "feedback";
      const up = document.createElement("button");
      up.type = "button"; up.textContent = "👍"; up.setAttribute("aria-label", "Good answer");
      const down = document.createElement("button");
      down.type = "button"; down.textContent = "👎"; down.setAttribute("aria-label", "Bad answer");
      up.addEventListener("click", () => rate(up, down, true, fb));
      down.addEventListener("click", () => rate(down, up, false, fb));
      fb.appendChild(up); fb.appendChild(down);
      if (meta && meta.intentId) fb.dataset.intent = meta.intentId;
      bubble.appendChild(fb);
    }

    els.messages.appendChild(msg);
    els.messages.scrollTop = els.messages.scrollHeight;
    return msg;
  }

  function rate(btn, other, good, fb) {
    if (fb.dataset.rated) return;
    fb.dataset.rated = "1";
    if (good) state.feedback.up++; else state.feedback.down++;
    btn.classList.add("rated");
    other.disabled = true;
    btn.disabled = true;
    updateFeedbackStats();
  }

  function updateFeedbackStats() {
    const total = state.feedback.up + state.feedback.down;
    els.feedbackStats.textContent = total
      ? `Rated: ${state.feedback.up} 👍 / ${state.feedback.down} 👎`
      : "No responses rated yet.";
  }

  function logEscalation(intentId) {
    try {
      const list = JSON.parse(localStorage.getItem("iim_escalations") || "[]");
      list.push({ intent: intentId, at: new Date().toISOString() });
      localStorage.setItem("iim_escalations", JSON.stringify(list));
    } catch (e) { /* storage may be unavailable */ }
  }

async function handleResponse(text) {
  const cleanText = text.trim().toLowerCase();

  /*
   * Handle simple greetings without using RAG.
   */
  const greetingWords = [
    "hi",
    "hello",
    "hey",
    "hiya",
    "good morning",
    "good afternoon",
    "good evening",
  ];

  if (greetingWords.includes(cleanText)) {
    botSay(
      "Hello! How can I help you today? You can ask me about IIM certifications, membership, training programs, events, advisory services, or contact information.",
      [
        "Certifications overview",
        "Membership",
        "Training programs",
        "Events & conferences",
      ],
      {
        intentId: "greeting",
        responseMode: "Built-in conversation",
      }
    );

    return;
  }

  /*
   * Handle simple thank-you messages.
   */
  const thankYouWords = [
    "thanks",
    "thank you",
    "thankyou",
    "thanks a lot",
    "thank you so much",
  ];

  if (thankYouWords.includes(cleanText)) {
    botSay(
      "You're welcome! Is there anything else you would like to know about IIM?",
      [
        "Certifications overview",
        "Membership",
        "Talk to a human",
      ],
      {
        intentId: "thanks",
        responseMode: "Built-in conversation",
      }
    );

    return;
  }

  /*
   * Handle goodbye messages.
   */
  const goodbyeWords = [
    "bye",
    "goodbye",
    "see you",
    "see you later",
  ];

  if (goodbyeWords.includes(cleanText)) {
    botSay(
      "Goodbye! Feel free to return whenever you need information about IIM.",
      [],
      {
        intentId: "goodbye",
        responseMode: "Built-in conversation",
      }
    );

    return;
  }

  /*
   * Use the local LLM and RAG for IIM-related questions.
   */
  if (state.llm.enabled) {
    try {
      const result = await callLLM(text);

      if (result && result.answer) {
        const uniqueSources = [...new Set(result.sources)];

        const sourceText = uniqueSources.length
            ? "\n\n### Sources\n" +
              uniqueSources
                .map((source) => "- " + source)
                .join("\n")
            : "";
        botSay(
          result.answer +
            sourceText,
          [],
          {
            intentId: "llm-rag",
            responseMode: "Local LLM + RAG",
          }
        );

        return;
      }
    } catch (error) {
      console.error(
        "Local LLM unavailable. Using offline fallback.",
        error
      );
    }
  }

  /*
   * Use the offline intent engine if the LLM is unavailable.
   */
  const response = Engine.respond(text);

  botSay(
    response.text,
    response.quickReplies,
    {
      intentId: response.intentId,
      escalate: response.escalate,
      responseMode: "Offline fallback",
    }
  );
}


  async function callLLM(userText) {
  const base = (
    state.llm.base ||
    PROVIDER_DEFAULTS[state.llm.provider].base
  ).replace(/\/+$/, "");

  const url = base + "/chat/completions";

  const headers = {
    "Content-Type": "application/json",
  };

  if (state.llm.provider === "openai" && state.llm.key) {
    headers.Authorization = "Bearer " + state.llm.key;
  }

  const chunks = window.IIM_RAG.retrieve(userText, 4);

  if (!chunks.length) {
    return {
      answer:
        "I could not find approved IIM information that clearly answers this question. " +
        "Please contact IIM at info@iim-africa.org or +61 451 109 163 for official assistance.",
      sources: [],
    };
  }

  const context = chunks
    .map((chunk, index) => {
      return (
        "SOURCE " +
        (index + 1) +
        "\n" +
        "Title: " +
        chunk.title +
        "\n" +
        "Verification status: " +
        (chunk.verified ? "Verified" : "Pending verification") +
        "\n" +
        "Information: " +
        chunk.text
      );
    })
    .join("\n\n");

  const body = {
    model: state.llm.model,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content:
          "APPROVED IIM KNOWLEDGE:\n\n" +
          context +
          "\n\nUSER QUESTION:\n" +
          userText,
      },
    ],
    temperature: 0.1,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      "LLM request failed with status " +
      response.status +
      ": " +
      errorText
    );
  }

  const data = await response.json();

  const answer =
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content;

  if (!answer) {
    throw new Error("The LLM returned an empty or invalid response.");
  }

  return {
    answer: answer.trim(),
    sources: chunks.map((chunk) => chunk.title),
  };
}

  function showTyping(on) {
    els.typing.classList.toggle("hidden", !on);
    if (on) els.messages.scrollTop = els.messages.scrollHeight;
  }

  function applyProviderDefaults() {
  const provider = els.llmProvider.value;
  const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.local;
  els.llmBase.value = defaults.base;
  els.llmModel.value = defaults.model;

  if (els.providerHint) {
    els.providerHint.textContent = defaults.hint;
  }
}

  function openSettings() {
    applyProviderDefaults();
    els.settingsDialog.classList.remove("hidden");
    els.settingsBtn.setAttribute("aria-expanded", "true");
    els.llmKey.focus();
  }
  function closeSettings() {
    els.settingsDialog.classList.add("hidden");
    els.settingsBtn.setAttribute("aria-expanded", "false");
  }
  function saveSettings() {
  const provider = els.llmProvider.value;
  const defaults = PROVIDER_DEFAULTS[provider];

  state.llm.provider = provider;
  state.llm.base = els.llmBase.value.trim() || defaults.base;
  state.llm.model = els.llmModel.value.trim() || defaults.model;
  state.llm.key = els.llmKey.value.trim();
  state.llm.enabled = true;

  closeSettings();

  const where =
    provider === "local"
      ? "local Ollama model: " + state.llm.model
      : "OpenAI cloud model: " + state.llm.model;

  botSay(
    "LLM mode enabled using " +
      where +
      ". If the LLM is unavailable, the chatbot will use its offline fallback.",
    [],
    {
      intentId: "settings",
      responseMode: provider === "local" ? "Local LLM" : "Cloud LLM",
    }
  );
}

  document.addEventListener("DOMContentLoaded", init);
})();
