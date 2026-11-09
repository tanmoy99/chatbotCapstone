/* IIM Chatbot — UI, backend chat requests, and connection fallback */
(function () {
  "use strict";

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
    systemStatus: document.getElementById("system-status"),
    statusText: document.getElementById("status-text"),
    chatScroll: document.getElementById("chat-scroll"),
    welcome: document.getElementById("welcome"),
    welcomeCards: document.getElementById("welcome-cards"),
    sidebarToggle: document.getElementById("sidebar-toggle"),
    sidebarBackdrop: document.getElementById("sidebar-backdrop"),
    newChatBtn: document.getElementById("new-chat-btn"),
  };

  const ICONS = {
    up:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M7 11v9H4v-9h3Zm0 0 4-7c1.7 0 2.6 1.2 2.2 2.8L12.6 10H18a2 2 0 0 1 2 2.3l-1.1 6A2 2 0 0 1 17 20H7" ' +
      'stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    down:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M17 13V4h3v9h-3Zm0 0-4 7c-1.7 0-2.6-1.2-2.2-2.8l.6-3.2H6a2 2 0 0 1-2-2.3l1.1-6A2 2 0 0 1 7 4h10" ' +
      'stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    copy:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" stroke-width="1.7"/>' +
      '<path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9" stroke="currentColor" stroke-width="1.7"/></svg>',
    check:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  const state = {
    feedback: {
      up: 0,
      down: 0,
    },

    /*
     * Stores recent messages so the model can understand
     * follow-up questions.
     */
    conversation: [],

    maxHistoryMessages: 8,
    requestInProgress: false,
  };

  function init() {
    /*
     * Confirm that all required JavaScript files loaded.
     */
    if (!KB || !Engine) {
      console.error(
        "One or more chatbot modules failed to load.",
        {
          KB,
          Engine,
        }
      );

      if (els.messages) {
        addMessage(
          "bot",
          "The chatbot could not start because one of its JavaScript files did not load. " +
            "Please check the browser console and confirm that knowledge-data.js, " +
            "knowledge.js, engine.js, and app.js are loaded in that order."
        );
      }

      return;
    }

    if (els.about) {
      els.about.textContent =
        KB.org.name +
        " — " +
        KB.org.city +
        ", " +
        KB.org.country +
        ". A global authority and certification body for data and information management.";
    }

    populatePersonas();
    populateTopicChips();
    bindEvents();
    updateFeedbackStats();
    checkSystemStatus();
    window.setInterval(checkSystemStatus, 10000);

    /*
     * The welcome screen (hero + suggestion cards) replaces the old
     * greeting message until the first question is sent.
     */
    if (els.input) {
      els.input.focus();
    }
  }

  function setChatStarted(started) {
    document.body.classList.toggle("chat-started", started);
  }

  function setSidebarOpen(open) {
    document.body.classList.toggle("sidebar-open", open);

    if (els.sidebarToggle) {
      els.sidebarToggle.setAttribute("aria-expanded", String(open));
      els.sidebarToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
  }

  function startNewChat() {
    if (state.requestInProgress) {
      return;
    }

    state.conversation = [];

    if (els.messages) {
      els.messages.innerHTML = "";
    }

    if (els.persona) {
      els.persona.value = "";
    }

    if (els.personaHint) {
      els.personaHint.textContent = "";
    }

    setChatStarted(false);
    setSidebarOpen(false);

    if (els.input) {
      els.input.value = "";
      autoGrowInput();
      els.input.focus();
    }
  }

  function autoGrowInput() {
    if (!els.input || els.input.tagName !== "TEXTAREA") {
      return;
    }

    els.input.style.height = "auto";
    els.input.style.height = Math.min(els.input.scrollHeight, 180) + "px";
  }

  function scrollToBottom() {
    const scroller = els.chatScroll || els.messages;

    if (scroller) {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }

  function populatePersonas() {
    if (!els.persona) {
      return;
    }

    KB.personas.forEach((persona) => {
      const option = document.createElement("option");

      option.value = persona.id;
      option.textContent = persona.label;

      els.persona.appendChild(option);
    });
  }

  function populateTopicChips() {
    if (!els.topicChips) {
      return;
    }

    KB.suggestedTopics.forEach((topic) => {
      const chip = document.createElement("button");

      chip.className = "chip";
      chip.type = "button";
      chip.textContent = topic;

      chip.addEventListener(
        "click",
        () => {
          setSidebarOpen(false);
          sendUserMessage(topic);
        }
      );

      els.topicChips.appendChild(chip);
    });
  }

  function bindEvents() {
    if (els.persona) {
      els.persona.addEventListener(
        "change",
        onPersonaChange
      );
    }

    if (els.form) {
      els.form.addEventListener(
        "submit",
        (event) => {
          event.preventDefault();

          sendUserMessage(
            els.input
              ? els.input.value
              : ""
          );
        }
      );
    }

    if (els.input) {
      els.input.addEventListener("input", autoGrowInput);

      /* Enter sends; Shift+Enter inserts a new line. */
      els.input.addEventListener("keydown", (event) => {
        if (
          event.key === "Enter" &&
          !event.shiftKey &&
          !event.isComposing
        ) {
          event.preventDefault();

          if (els.form) {
            els.form.requestSubmit();
          }
        }
      });
    }

    if (els.welcomeCards) {
      els.welcomeCards.addEventListener("click", (event) => {
        const card = event.target.closest("[data-question]");

        if (card) {
          sendUserMessage(card.dataset.question);
        }
      });
    }

    if (els.sidebarToggle) {
      els.sidebarToggle.addEventListener("click", () =>
        setSidebarOpen(!document.body.classList.contains("sidebar-open"))
      );
    }

    if (els.sidebarBackdrop) {
      els.sidebarBackdrop.addEventListener("click", () => setSidebarOpen(false));
    }

    if (els.newChatBtn) {
      els.newChatBtn.addEventListener("click", startNewChat);
    }

    if (els.settingsBtn) {
      els.settingsBtn.addEventListener(
        "click",
        openSettings
      );
    }

    if (els.settingsClose) {
      els.settingsClose.addEventListener(
        "click",
        closeSettings
      );
    }

    if (els.settingsDialog) {
      els.settingsDialog.addEventListener(
        "click",
        (event) => {
          if (
            event.target ===
            els.settingsDialog
          ) {
            closeSettings();
          }
        }
      );
    }

    /*
     * Close Settings with the Escape key.
     */
    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape" &&
          els.settingsDialog &&
          !els.settingsDialog.classList.contains(
            "hidden"
          )
        ) {
          closeSettings();
        } else if (
          event.key === "Escape" &&
          document.body.classList.contains("sidebar-open")
        ) {
          setSidebarOpen(false);
        }
      }
    );
  }

  function onPersonaChange() {
    const selectedPersona =
      KB.personas.find(
        (persona) =>
          persona.id ===
          els.persona.value
      );

    if (!selectedPersona) {
      if (els.personaHint) {
        els.personaHint.textContent = "";
      }

      return;
    }

    if (els.personaHint) {
      els.personaHint.textContent =
        "Suggested for you: " +
        selectedPersona.needs;
    }

    sendUserMessage(
      selectedPersona.starter
    );
  }

  async function sendUserMessage(text) {
    const cleanText =
      String(text || "").trim();

    if (
      !cleanText ||
      state.requestInProgress
    ) {
      return;
    }

    if (els.input) {
      els.input.value = "";
      autoGrowInput();
    }

    setChatStarted(true);
    setSidebarOpen(false);

    userSay(cleanText);

    rememberMessage(
      "user",
      cleanText
    );

    state.requestInProgress = true;

    setFormDisabled(true);
    showTyping(true);

    try {
      await handleResponse(cleanText);
    } catch (error) {
      console.error(
        "Unexpected chatbot error:",
        error
      );

      const message =
        "Sorry, something went wrong while I was preparing the answer. " +
        "Please try again. If the problem continues, check that Ollama is running " +
        "and open the browser console for the error details.";

      botSay(
        message,
        [
          "Try again",
          "Talk to a human",
        ],
        {
          intentId: "unexpected-error",
        }
      );

      rememberMessage(
        "assistant",
        message
      );
    } finally {
      showTyping(false);

      state.requestInProgress = false;

      setFormDisabled(false);

      if (els.input) {
        els.input.focus();
      }
    }
  }

  function setFormDisabled(disabled) {
    if (els.input) {
      els.input.disabled = disabled;
    }

    if (els.form) {
      const submitButton =
        els.form.querySelector(
          'button[type="submit"]'
        );

      if (submitButton) {
        submitButton.disabled =
          disabled;
      }
    }
  }

  /*
   * Save a small conversation history.
   */
  function rememberMessage(
    role,
    content
  ) {
    state.conversation.push({
      role,
      content:
        String(content || "").trim(),
    });

    if (
      state.conversation.length >
      state.maxHistoryMessages
    ) {
      state.conversation =
        state.conversation.slice(
          -state.maxHistoryMessages
        );
    }
  }

  /*
   * The current user message is already supplied separately,
   * so remove it from the history sent to the model.
   */
  function getConversationHistory() {
    return state.conversation
      .slice(0, -1)
      .slice(-6)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));
  }

  function userSay(text) {
    addMessage(
      "user",
      text
    );
  }

  function botSay(
    text,
    quickReplies,
    meta
  ) {
    const node = addMessage(
      "bot",
      text,
      meta
    );

    const sourceList = [
      ...new Set(
        ((meta && meta.sources) || []).filter(Boolean)
      ),
    ];

    if (sourceList.length) {
      const sources = document.createElement("div");
      sources.className = "sources";

      const label = document.createElement("span");
      label.className = "sources-label";
      label.textContent = "Sources";
      sources.appendChild(label);

      sourceList.forEach((source) => {
        const chip = document.createElement("span");
        chip.className = "source-chip";
        chip.textContent = source;
        sources.appendChild(chip);
      });

      const bubble = node.querySelector(".bubble");

      if (bubble) {
        bubble.appendChild(sources);
      }
    }

    if (
      quickReplies &&
      quickReplies.length
    ) {
      const quickReplyWrapper =
        document.createElement("div");

      quickReplyWrapper.className =
        "quick";

      quickReplies.forEach(
        (reply) => {
          const button =
            document.createElement(
              "button"
            );

          button.type = "button";
          button.textContent = reply;

          button.addEventListener(
            "click",
            () =>
              sendUserMessage(reply)
          );

          quickReplyWrapper.appendChild(
            button
          );
        }
      );

      const bubble =
        node.querySelector(".bubble");

      if (bubble) {
        bubble.appendChild(
          quickReplyWrapper
        );
      }
    }

    if (
      meta &&
      meta.escalate
    ) {
      const escalationCard =
        document.createElement("div");

      escalationCard.className =
        "escalation";

      escalationCard.textContent =
        "⚠ Enquiry logged for IIM follow-up.";

      const bubble =
        node.querySelector(".bubble");

      if (bubble) {
        bubble.appendChild(
          escalationCard
        );
      }

      logEscalation(
        meta.intentId
      );
    }

    return node;
  }

  /*
   * Prevent model output from inserting unsafe HTML.
   */
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /*
   * Safe inline Markdown formatting.
   */
  function formatInlineMarkdown(
    text
  ) {
    let safeText =
      escapeHtml(text);

    safeText =
      safeText.replace(
        /`([^`]+)`/g,
        "<code>$1</code>"
      );

    safeText =
      safeText.replace(
        /\*\*([^*]+)\*\*/g,
        "<strong>$1</strong>"
      );

    safeText =
      safeText.replace(
        /(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,!?])/g,
        "$1<em>$2</em>"
      );

    /*
     * Convert email addresses into mail links.
     */
    safeText =
      safeText.replace(
        /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi,
        '<a href="mailto:$1">$1</a>'
      );

    return safeText;
  }

  function isTableSeparator(line) {
    const cells = line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map(
        (cell) => cell.trim()
      );

    return (
      cells.length > 0 &&
      cells.every(
        (cell) =>
          /^:?-{3,}:?$/.test(cell)
      )
    );
  }

  function parseTableRow(line) {
    return line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map(
        (cell) => cell.trim()
      );
  }

  /*
   * Converts a limited and safe subset of Markdown to HTML.
   */
  function markdownToHtml(markdown) {
    const lines =
  normalizeMarkdownBlocks(markdown)
    .replace(/\r\n/g, "\n")
    /*
     * Convert escaped Markdown list markers, such as "\* Item",
     * into proper list markers before rendering.
     */
    .replace(/^\s*\\([*+-])\s+/gm, "$1 ")
    .split("\n");

    const html = [];

    let paragraph = [];
    let listType = null;

    function closeParagraph() {
      if (!paragraph.length) {
        return;
      }

      html.push(
        "<p>" +
          paragraph
            .map(
              formatInlineMarkdown
            )
            .join(" ") +
          "</p>"
      );

      paragraph = [];
    }

    function closeList() {
      if (!listType) {
        return;
      }

      html.push(
        listType === "ul"
          ? "</ul>"
          : "</ol>"
      );

      listType = null;
    }

    function openList(type) {
      if (listType === type) {
        return;
      }

      closeParagraph();
      closeList();

      html.push(
        type === "ul"
          ? "<ul>"
          : "<ol>"
      );

      listType = type;
    }

    for (
      let index = 0;
      index < lines.length;
      index += 1
    ) {
      const line =
        lines[index].trim();

      if (!line) {
        closeParagraph();
        closeList();
        continue;
      }

      /*
       * Markdown table.
       */
      if (
        line.includes("|") &&
        index + 1 < lines.length &&
        isTableSeparator(
          lines[index + 1]
        )
      ) {
        closeParagraph();
        closeList();

        const headers =
          parseTableRow(line);

        html.push(
          '<div class="table-wrap">'
        );

        html.push(
          "<table><thead><tr>"
        );

        headers.forEach(
          (header) => {
            html.push(
              "<th>" +
                formatInlineMarkdown(
                  header
                ) +
                "</th>"
            );
          }
        );

        html.push(
          "</tr></thead><tbody>"
        );

        index += 2;

        while (
          index < lines.length &&
          lines[index].trim() &&
          lines[index].includes("|")
        ) {
          const cells =
            parseTableRow(
              lines[index]
            );

          html.push("<tr>");

          headers.forEach(
            (_, cellIndex) => {
              const cell =
                cells[cellIndex] || "";

              html.push(
                "<td>" +
                  formatInlineMarkdown(
                    cell
                  ) +
                  "</td>"
              );
            }
          );

          html.push("</tr>");

          index += 1;
        }

        html.push(
          "</tbody></table></div>"
        );

        index -= 1;
        continue;
      }

      if (
        line.startsWith("#### ")
      ) {
        closeParagraph();
        closeList();

        html.push(
          "<h4>" +
            formatInlineMarkdown(
              line.slice(5)
            ) +
            "</h4>"
        );

        continue;
      }

      if (
        line.startsWith("### ")
      ) {
        closeParagraph();
        closeList();

        html.push(
          "<h3>" +
            formatInlineMarkdown(
              line.slice(4)
            ) +
            "</h3>"
        );

        continue;
      }

      if (
        line.startsWith("## ")
      ) {
        closeParagraph();
        closeList();

        html.push(
          "<h2>" +
            formatInlineMarkdown(
              line.slice(3)
            ) +
            "</h2>"
        );

        continue;
      }

      const bulletMatch =
        line.match(
          /^[-*•]\s+(.+)$/
        );

      if (bulletMatch) {
        openList("ul");

        html.push(
          "<li>" +
            formatInlineMarkdown(
              bulletMatch[1]
            ) +
            "</li>"
        );

        continue;
      }

      const numberMatch =
        line.match(
          /^\d+[.)]\s+(.+)$/
        );

      if (numberMatch) {
        openList("ol");

        html.push(
          "<li>" +
            formatInlineMarkdown(
              numberMatch[1]
            ) +
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

  /*
   * Small local models sometimes put a heading and every list item on one
   * line (for example, "Grades: 1. Student 2. Graduate").  Restore block
   * boundaries before parsing so valid-looking Markdown does not render as
   * one malformed paragraph.
   */
  function normalizeMarkdownBlocks(markdown) {
    const lines = String(markdown || "")
      .split("\n")
      .map((line) => {
        const orderedMarkers =
          line.match(/\s+\d+[.)]\s+/g) || [];
        const bulletMarkers =
          line.match(/\s+[-*\u2022]\s+/g) || [];

        /* Inline ordered lists produced by small models normally follow a
         * label such as "Grades:" and contain at least two items. Requiring
         * both signals prevents sentence-ending values such as "USD 180."
         * or "in 2026." from being reinterpreted as list markers. */
        if (
          line.includes(":") &&
          orderedMarkers.length >= 2
        ) {
          return line.replace(
            /\s+(?=\d+[.)]\s+)/g,
            "\n"
          );
        }

        /* A single spaced hyphen is often punctuation inside a formal name
         * (for example, "Certified Data Professional - Compliance"). Only
         * reinterpret inline bullets when the line has a list label and at
         * least two bullet markers. */
        if (
          line.includes(":") &&
          bulletMarkers.length >= 2
        ) {
          return line.replace(
            /\s+(?=[-*\u2022]\s+)/g,
            "\n"
          );
        }

        return line;
      })
      .join("\n");

    return lines
      .replace(/([^\n])\s+(?=#{2,4}\s+)/g, "$1\n");
  }

  function addMessage(
    role,
    text,
    meta
  ) {
    const message =
      document.createElement("div");

    message.className =
      "msg " + role;

    const bubble =
      document.createElement("div");

    bubble.className = "bubble";

    if (role === "bot") {
      bubble.innerHTML =
        markdownToHtml(text);
    } else {
      bubble.textContent = text;
    }

    const body =
      document.createElement("div");

    body.className = "msg-body";
    body.appendChild(bubble);

    const metaRow =
      document.createElement("div");

    metaRow.className = "msg-meta";

    const time =
      document.createElement("time");

    const now = new Date();
    time.dateTime = now.toISOString();
    time.textContent = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    metaRow.appendChild(time);
    body.appendChild(metaRow);

    if (role === "bot") {
      const avatar =
        document.createElement("div");

      avatar.className = "avatar";
      avatar.setAttribute("aria-hidden", "true");
      message.appendChild(avatar);
    }

    message.appendChild(body);

    if (role === "bot") {
      const copyButton =
        document.createElement("button");

      copyButton.type = "button";
      copyButton.className = "copy-btn";
      copyButton.innerHTML = ICONS.copy;
      copyButton.setAttribute("aria-label", "Copy answer");
      copyButton.title = "Copy answer";

      copyButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(String(text || ""));
          copyButton.innerHTML = ICONS.check;
          copyButton.classList.add("copied");

          window.setTimeout(() => {
            copyButton.innerHTML = ICONS.copy;
            copyButton.classList.remove("copied");
          }, 1500);
        } catch (error) {
          console.warn("Copy failed:", error);
        }
      });

      metaRow.appendChild(copyButton);

      const feedback =
        document.createElement("div");

      feedback.className =
        "feedback";

      const upButton =
        document.createElement(
          "button"
        );

      upButton.type = "button";
      upButton.innerHTML = ICONS.up;
      upButton.title = "Helpful";

      upButton.setAttribute(
        "aria-label",
        "Good answer"
      );

      const downButton =
        document.createElement(
          "button"
        );

      downButton.type = "button";
      downButton.innerHTML = ICONS.down;
      downButton.title = "Not helpful";

      downButton.setAttribute(
        "aria-label",
        "Bad answer"
      );

      upButton.addEventListener(
        "click",
        () =>
          rate(
            upButton,
            downButton,
            true,
            feedback
          )
      );

      downButton.addEventListener(
        "click",
        () =>
          rate(
            downButton,
            upButton,
            false,
            feedback
          )
      );

      feedback.appendChild(
        upButton
      );

      feedback.appendChild(
        downButton
      );

      if (
        meta &&
        meta.intentId
      ) {
        feedback.dataset.intent =
          meta.intentId;
      }

      metaRow.appendChild(
        feedback
      );
    }

    els.messages.appendChild(
      message
    );

    scrollToBottom();

    return message;
  }

  function rate(
    button,
    otherButton,
    good,
    feedback
  ) {
    if (
      feedback.dataset.rated
    ) {
      return;
    }

    feedback.dataset.rated =
      "1";

    if (good) {
      state.feedback.up += 1;
    } else {
      state.feedback.down += 1;
    }

    button.classList.add(
      "rated"
    );

    button.disabled = true;
    otherButton.disabled = true;

    updateFeedbackStats();
  }

  function updateFeedbackStats() {
    if (!els.feedbackStats) {
      return;
    }

    const total =
      state.feedback.up +
      state.feedback.down;

    els.feedbackStats.textContent =
      total
        ? `Rated: ${state.feedback.up} 👍 / ${state.feedback.down} 👎`
        : "No responses rated yet.";
  }

  function logEscalation(intentId) {
    try {
      const escalations =
        JSON.parse(
          localStorage.getItem(
            "iim_escalations"
          ) || "[]"
        );

      escalations.push({
        intent: intentId,
        at:
          new Date().toISOString(),
      });

      localStorage.setItem(
        "iim_escalations",
        JSON.stringify(
          escalations
        )
      );
    } catch (error) {
      console.warn(
        "Escalation could not be saved:",
        error
      );
    }
  }

  function normalizeConversationText(text) {
  const normalized = String(text || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const aliases = {
    u: "you",
    r: "are",
    ur: "your",
    ya: "you",
    im: "i am",
    ive: "i have",
    whats: "what is",
    whos: "who is",
    hows: "how is",
    cant: "cannot",
    dont: "do not",
    pls: "please",
    plz: "please",
    thx: "thanks",
    thanx: "thanks",
  };

  return normalized
    .split(" ")
    .map((word) => aliases[word] || word)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

  /*
   * Handles normal conversation without searching
   * the knowledge base.
   */
  function getBuiltInConversationResponse(
    text
  ) {
    const cleanText =
      normalizeConversationText(
        text
      );

    const exactGreetings =
      new Set([
        "hi",
        "hello",
        "hey",
        "hiya",
        "good morning",
        "good afternoon",
        "good evening",
      ]);

    if (
      exactGreetings.has(
        cleanText
      )
    ) {
      return {
        text:
          "Hello! How can I help you today? You can ask about IIM certifications, " +
          "membership, training, events, advisory services, or contact information.",

        quickReplies: [
          "Certifications overview",
          "Membership",
          "Training programs",
          "Events & conferences",
        ],

        intentId: "greeting",
      };
    }

    const isWellbeingQuestion =
  /\bhow\s+(?:are|is)\s+(?:you|it|things)\b/.test(
    cleanText
  ) ||
  /\bare\s+you\s+(?:okay|ok|good|well)\b/.test(
    cleanText
  ) ||
  /\bhow\s+you\s+(?:doing|going)\b/.test(
    cleanText
  );

if (isWellbeingQuestion) {
  return {
    text:
      "I’m doing well, thank you! I’m ready to help with IIM certifications, " +
      "membership, training, events, advisory services, or contact information.",

    quickReplies: [
      "Membership",
      "CDPO certification",
      "Talk to a human",
    ],

    intentId: "wellbeing",
  };
}

    const thankYouPatterns = [
      "thanks",
      "thank you",
      "thankyou",
      "thanks a lot",
      "thank you so much",
    ];

    if (
      thankYouPatterns.includes(
        cleanText
      )
    ) {
      return {
        text:
          "You’re welcome! What else would you like to know about IIM?",

        quickReplies: [
          "Certifications overview",
          "Membership",
          "Talk to a human",
        ],

        intentId: "thanks",
      };
    }

    const goodbyePatterns = [
      "bye",
      "goodbye",
      "see you",
      "see you later",
    ];

    if (
      goodbyePatterns.includes(
        cleanText
      )
    ) {
      return {
        text:
          "Goodbye! You’re welcome to return whenever you need information about IIM.",

        quickReplies: [],

        intentId: "goodbye",
      };
    }

    if (
      cleanText === "who are you" ||
      cleanText === "what are you" ||
      cleanText.includes(
        "what can you do"
      ) ||
      /\bwhat\s+can\s+you\s+help\s+(?:me\s+)?with\b/.test(
        cleanText
      )
    ) {
      return {
        text:
          "I’m IIM’s AI information assistant. I use approved IIM knowledge to answer " +
          "questions about certifications, membership, training, events, advisory services, " +
          "and contact details. When information is not confirmed, I’ll say so rather than guessing.",

        quickReplies: [
          "Certifications overview",
          "Membership",
          "Training programs",
        ],

        intentId:
          "assistant-introduction",
      };
    }

    return null;
  }

  async function handleResponse(
    text
  ) {
    const builtInResponse =
      getBuiltInConversationResponse(
        text
      );

    if (builtInResponse) {
      botSay(
        builtInResponse.text,
        builtInResponse.quickReplies,
        {
          intentId:
            builtInResponse.intentId,
        }
      );

      rememberMessage(
        "assistant",
        builtInResponse.text
      );

      return;
    }

    try {
      const result = await requestChat(text);
      botSay(result.answer, result.quickReplies, {
        intentId: "backend-chat",
        sources: result.sources,
      });
      rememberMessage("assistant", result.answer);
      return;
    } catch (error) {
      console.warn("Backend unavailable. Using browser rule-based fallback.", error);
    }

    /*
     * Preserve browser answers when the backend request fails.
     */
    const response =
      Engine.respond(text);

    botSay(
      response.text,
      response.quickReplies,
      {
        intentId:
          response.intentId,

        escalate:
          response.escalate,

        sources:
          response.sources,
      }
    );

    rememberMessage(
      "assistant",
      response.text
    );
  }

async function requestChat(
  userText
) {
  const response =
    await fetch(
      "/api/chat",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            message: userText,

            history:
              getConversationHistory(),
          }),
      }
    );

  let data;

  try {
    data =
      await response.json();
  } catch (error) {
    throw new Error(
      "The server returned an invalid response."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        `The server returned status ${response.status}.`
    );
  }

  if (
    !data.answer ||
    !String(data.answer).trim()
  ) {
    throw new Error(
      "The backend returned an empty answer."
    );
  }

  return {
    answer:
      String(
        data.answer
      ).trim(),

    sources:
      Array.isArray(
        data.sources
      )
        ? data.sources
        : [],

    quickReplies:
      Array.isArray(
        data.quickReplies
      )
        ? data.quickReplies
        : [],

  };
}

  function showTyping(on) {
    if (!els.typing) {
      return;
    }

    els.typing.classList.toggle(
      "hidden",
      !on
    );

    if (on) {
      scrollToBottom();
    }
  }

  function openSettings() {
    if (!els.settingsDialog) {
      return;
    }

    els.settingsDialog.classList.remove(
      "hidden"
    );

    if (els.settingsBtn) {
      els.settingsBtn.setAttribute(
        "aria-expanded",
        "true"
      );
    }

    els.settingsClose.focus();
  }

  function closeSettings() {
    if (!els.settingsDialog) {
      return;
    }

    els.settingsDialog.classList.add(
      "hidden"
    );

    if (els.settingsBtn) {
      els.settingsBtn.setAttribute(
        "aria-expanded",
        "false"
      );

      els.settingsBtn.focus();
    }
  }

  function updateSystemStatus(statusType, text, details) {
  if (!els.systemStatus || !els.statusText) {
    console.warn("System status HTML elements were not found.");
    return;
  }

  els.systemStatus.classList.remove(
    "checking",
    "connected",
    "fallback",
    "error"
  );

  els.systemStatus.classList.add(statusType);
  els.statusText.textContent = text;

  const description = details || text;

  els.systemStatus.title = description;
  els.systemStatus.setAttribute("aria-label", description);
}

async function checkSystemStatus() {
  updateSystemStatus(
    "checking",
    "Checking AI...",
    "Checking the backend, Ollama model and knowledge base"
  );

  try {
    const response = await fetch("/api/health", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        "Health endpoint returned status " + response.status
      );
    }

    const data = await response.json();

    const serverConnected =
      data.server === "connected";

    const ollamaConnected = Boolean(
      data.ollama && data.ollama.connected
    );

    const model =
      data.ollama && data.ollama.configuredModel
        ? data.ollama.configuredModel
        : "Unknown model";

    const knowledgeLoaded = Boolean(
      data.knowledgeBase && data.knowledgeBase.loaded
    );

    const documentCount =
      data.knowledgeBase &&
      Number.isFinite(data.knowledgeBase.documents)
        ? data.knowledgeBase.documents
        : 0;

    if (
      serverConnected &&
      ollamaConnected &&
      knowledgeLoaded
    ) {
     updateSystemStatus(
  "connected",
  "Ollama available",
  "Backend connected • Ollama service available • " +
    "Configured model: " +
    model +
    " • Knowledge documents: " +
    documentCount
);
      return;
    }

    if (
      serverConnected &&
      knowledgeLoaded &&
      !ollamaConnected
    ) {
      updateSystemStatus(
        "fallback",
        "Offline fallback",
        "Backend connected • Ollama unavailable • " +
          "Configured model: " +
          model +
          " • Knowledge documents: " +
          documentCount +
          " • Rule-based fallback available"
      );

      return;
    }

    updateSystemStatus(
      "error",
      "Limited mode",
      "Backend: " +
        (serverConnected ? "connected" : "unavailable") +
        " • Ollama: " +
        (ollamaConnected ? "connected" : "unavailable") +
        " • Knowledge base: " +
        (knowledgeLoaded ? "loaded" : "unavailable")
    );
  } catch (error) {
    console.error("System health check failed:", error);

    updateSystemStatus(
      "error",
      "Connection error",
      "The chatbot could not reach /api/health. " +
        "Confirm that the Node.js server is running at " + window.location.origin + "."
    );
  }
}

  document.addEventListener(
    "DOMContentLoaded",
    init
  );
})();
