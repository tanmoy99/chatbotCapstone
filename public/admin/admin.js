"use strict";

(function initialiseAdminPanel() {
  const elements = {
    loginScreen:
      document.getElementById("login-screen"),

    loginForm:
      document.getElementById("login-form"),

    password:
      document.getElementById("admin-password"),

    loginMessage:
      document.getElementById("login-message"),

    adminPanel:
      document.getElementById("admin-panel"),

    logout:
      document.getElementById("logout-button"),

    recordCount:
      document.getElementById("record-count"),

    search:
      document.getElementById("search-input"),

    recordList:
      document.getElementById("record-list"),

    newRecord:
      document.getElementById("new-record-button"),

    editorTitle:
      document.getElementById("editor-title"),

    saveStatus:
      document.getElementById("save-status"),

    form:
      document.getElementById("knowledge-form"),

    emptyEditor:
      document.getElementById("empty-editor"),

    id:
      document.getElementById("record-id"),

    title:
      document.getElementById("record-title"),

    category:
      document.getElementById("record-category"),

    scope:
      document.getElementById("record-scope"),

    status:
      document.getElementById("record-status"),

    reviewed:
      document.getElementById("record-reviewed"),

    keywords:
      document.getElementById("record-keywords"),

    text:
      document.getElementById("record-text"),

    source:
      document.getElementById("record-source"),

    active:
      document.getElementById("record-active"),

    reset:
      document.getElementById("reset-button"),

    save:
      document.getElementById("save-button"),

    notification:
      document.getElementById("notification"),

    workspace:
      document.querySelector(".workspace"),

    viewKnowledge:
      document.getElementById("view-knowledge"),

    viewFeedback:
      document.getElementById("view-feedback"),

    feedbackWorkspace:
      document.getElementById("feedback-workspace"),

    feedbackSummary:
      document.getElementById("feedback-summary"),

    feedbackFilter:
      document.getElementById("feedback-filter"),

    feedbackRefresh:
      document.getElementById("feedback-refresh"),

    feedbackDownload:
      document.getElementById("feedback-download"),

    feedbackList:
      document.getElementById("feedback-list"),
  };

  const state = {
    password: "",
    documents: [],
    selectedId: null,
    isNew: false,
    feedback: [],
  };

  function today() {
    return new Date()
      .toISOString()
      .slice(0, 10);
  }

  async function apiRequest(
    url,
    options = {}
  ) {
    const response = await fetch(url, {
      ...options,

      headers: {
        "Content-Type":
          "application/json",

        "x-admin-password":
          state.password,

        ...(options.headers || {}),
      },
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
          `Request failed with status ${response.status}.`
      );
    }

    return data;
  }

  function showNotification(
    message,
    isError = false
  ) {
    elements.notification.textContent =
      message;

    elements.notification.classList.toggle(
      "error",
      isError
    );

    elements.notification.classList.remove(
      "hidden"
    );

    window.setTimeout(() => {
      elements.notification.classList.add(
        "hidden"
      );
    }, 5000);
  }

  function showLogin() {
    state.password = "";
    state.documents = [];
    state.selectedId = null;
    state.feedback = [];
    elements.feedbackList.replaceChildren();

    elements.workspace.classList.remove("hidden");
    elements.feedbackWorkspace.classList.add("hidden");
    elements.viewKnowledge.classList.add("active");
    elements.viewFeedback.classList.remove("active");
    elements.viewKnowledge.setAttribute("aria-pressed", "true");
    elements.viewFeedback.setAttribute("aria-pressed", "false");

    elements.password.value = "";

    elements.adminPanel.classList.add(
      "hidden"
    );

    elements.loginScreen.classList.remove(
      "hidden"
    );
  }

  function showAdmin() {
    elements.loginScreen.classList.add(
      "hidden"
    );

    elements.adminPanel.classList.remove(
      "hidden"
    );
  }

  function hideEditor() {
    elements.form.classList.add(
      "hidden"
    );

    elements.emptyEditor.classList.remove(
      "hidden"
    );

    elements.editorTitle.textContent =
      "Select a record";

    elements.saveStatus.textContent = "";
  }

  function displayRecord(document) {
    state.selectedId = document.id;
    state.isNew = false;

    elements.editorTitle.textContent =
      document.title;

    elements.id.value =
      document.id;

    elements.id.readOnly = true;

    elements.title.value =
      document.title || "";

    elements.category.value =
      document.category || "about";

    elements.scope.value =
      document.scope || "";

    elements.status.value =
      document.status || "verify";

    elements.reviewed.value =
      document.lastReviewed || today();

    elements.keywords.value =
      Array.isArray(document.keywords)
        ? document.keywords.join(", ")
        : "";

    elements.text.value =
      document.text || "";

    elements.source.value =
      document.source || "";

    elements.active.checked =
      document.active !== false;

    elements.emptyEditor.classList.add(
      "hidden"
    );

    elements.form.classList.remove(
      "hidden"
    );

    elements.saveStatus.textContent = "";

    renderRecords();
  }

  function createNewRecord() {
    state.selectedId = null;
    state.isNew = true;

    elements.form.reset();

    elements.id.readOnly = false;
    elements.id.value = "";

    elements.category.value = "about";
    elements.status.value = "verify";
    elements.reviewed.value = today();
    elements.active.checked = true;

    elements.editorTitle.textContent =
      "Create knowledge record";

    elements.saveStatus.textContent = "";

    elements.emptyEditor.classList.add(
      "hidden"
    );

    elements.form.classList.remove(
      "hidden"
    );

    elements.id.focus();

    renderRecords();
  }

  function getFilteredDocuments() {
    const query =
      elements.search.value
        .toLowerCase()
        .trim();

    if (!query) {
      return state.documents;
    }

    return state.documents.filter(
      (document) => {
        const searchable = [
          document.id,
          document.title,
          document.category,
          document.scope,
          ...(document.keywords || []),
        ]
          .join(" ")
          .toLowerCase();

        return searchable.includes(
          query
        );
      }
    );
  }

  function renderRecords() {
    const filtered =
      getFilteredDocuments();

    elements.recordList.replaceChildren();

    const activeCount =
      state.documents.filter(
        (document) =>
          document.active !== false
      ).length;

    elements.recordCount.textContent =
      `${state.documents.length} records · ${activeCount} active`;

    filtered.forEach(
      (document) => {
        const button =
          documentCreateButton(
            document
          );

        elements.recordList.appendChild(
          button
        );
      }
    );

    if (!filtered.length) {
      const empty =
        document.createElement("p");

      empty.textContent =
        "No matching records found.";

      empty.className =
        "message";

      elements.recordList.appendChild(
        empty
      );
    }
  }

  function documentCreateButton(
    knowledgeDocument
  ) {
    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      "record-item";

    if (
      state.selectedId ===
      knowledgeDocument.id
    ) {
      button.classList.add(
        "selected"
      );
    }

    const title =
      document.createElement("span");

    title.className =
      "record-item-title";

    title.textContent =
      knowledgeDocument.title;

    const meta =
      document.createElement("span");

    meta.className =
      "record-item-meta";

    const category =
      document.createElement("span");

    category.textContent =
      knowledgeDocument.category;

    const status =
      document.createElement("span");

    status.textContent =
      knowledgeDocument.active === false
        ? "Inactive"
        : knowledgeDocument.status;

    if (
      knowledgeDocument.active === false
    ) {
      status.classList.add(
        "inactive-label"
      );
    }

    meta.append(
      category,
      status
    );

    button.append(
      title,
      meta
    );

    button.addEventListener(
      "click",
      () =>
        displayRecord(
          knowledgeDocument
        )
    );

    return button;
  }

  async function loadDocuments() {
    const data =
      await apiRequest(
        "/api/admin/documents"
      );

    state.documents =
      Array.isArray(data.documents)
        ? data.documents.sort(
            (first, second) =>
              first.title.localeCompare(
                second.title
              )
          )
        : [];

    renderRecords();
    hideEditor();
  }

  /* ---------- Feedback view ---------- */

  function showView(name) {
    const feedback = name === "feedback";

    elements.workspace.classList.toggle("hidden", feedback);
    elements.feedbackWorkspace.classList.toggle("hidden", !feedback);
    elements.viewKnowledge.classList.toggle("active", !feedback);
    elements.viewFeedback.classList.toggle("active", feedback);
    elements.viewKnowledge.setAttribute("aria-pressed", String(!feedback));
    elements.viewFeedback.setAttribute("aria-pressed", String(feedback));

    if (feedback) {
      loadFeedback().catch((error) =>
        showNotification(error.message, true)
      );
    }
  }

  function formatWhen(isoText) {
    const date = new Date(isoText);

    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleString([], {
          dateStyle: "medium",
          timeStyle: "short",
        });
  }

  function textBlock(className, label, value) {
    const wrapper = document.createElement("div");
    wrapper.className = className;

    const heading = document.createElement("span");
    heading.className = "feedback-label";
    heading.textContent = label;

    const body = document.createElement("p");
    body.textContent = value || "—";

    wrapper.appendChild(heading);
    wrapper.appendChild(body);

    return wrapper;
  }

  function renderFeedback() {
    const filter = elements.feedbackFilter.value;
    const entries = state.feedback.filter(
      (entry) => filter === "all" || entry.rating === filter
    );

    elements.feedbackList.replaceChildren();

    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "feedback-empty";
      empty.textContent =
        filter === "down"
          ? "No answers have been rated not helpful."
          : "No ratings yet.";
      elements.feedbackList.appendChild(empty);
      return;
    }

    entries.forEach((entry) => {
      const item = document.createElement("article");
      item.className = `feedback-item ${entry.rating === "up" ? "good" : "bad"}`;

      const meta = document.createElement("div");
      meta.className = "feedback-meta";

      const badge = document.createElement("span");
      badge.className = "feedback-badge";
      badge.textContent = entry.rating === "up" ? "Helpful" : "Not helpful";

      const details = document.createElement("span");
      details.textContent = [
        formatWhen(entry.at),
        entry.fallbackReason
          ? `fallback: ${entry.fallbackReason}`
          : entry.provider,
        entry.embedded ? "embedded widget" : "",
      ]
        .filter(Boolean)
        .join(" · ");

      meta.appendChild(badge);
      meta.appendChild(details);
      item.appendChild(meta);
      item.appendChild(textBlock("feedback-question", "Question", entry.question));
      item.appendChild(textBlock("feedback-answer", "Answer", entry.answer));

      if (Array.isArray(entry.sources) && entry.sources.length) {
        item.appendChild(
          textBlock("feedback-sources", "Sources", entry.sources.join(", "))
        );
      }

      elements.feedbackList.appendChild(item);
    });
  }

  async function loadFeedback() {
    elements.feedbackSummary.textContent = "Loading feedback…";

    const data = await apiRequest("/api/admin/feedback");
    const summary = data.summary || { total: 0, up: 0, down: 0 };

    state.feedback = Array.isArray(data.entries) ? data.entries : [];

    const helpfulShare = summary.total
      ? Math.round((summary.up / summary.total) * 100)
      : 0;

    elements.feedbackSummary.textContent = summary.total
      ? `${summary.total} rated answers · ${summary.up} helpful · ${summary.down} not helpful (${helpfulShare}% helpful)`
      : "No answers have been rated yet.";

    renderFeedback();
  }

  async function downloadFeedbackCsv() {
    const response = await fetch("/api/admin/feedback.csv", {
      headers: { "x-admin-password": state.password },
    });

    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}.`);
    }

    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = `iim-chatbot-feedback-${today()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  elements.viewKnowledge.addEventListener("click", () => showView("knowledge"));
  elements.viewFeedback.addEventListener("click", () => showView("feedback"));
  elements.feedbackFilter.addEventListener("change", renderFeedback);

  elements.feedbackRefresh.addEventListener("click", () =>
    loadFeedback().catch((error) => showNotification(error.message, true))
  );

  elements.feedbackDownload.addEventListener("click", () =>
    downloadFeedbackCsv().catch((error) => showNotification(error.message, true))
  );

  elements.loginForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      elements.loginMessage.textContent =
        "";

      state.password =
        elements.password.value;

      try {
        await apiRequest(
          "/api/admin/login",
          {
            method: "POST",
            body: "{}",
          }
        );

        showAdmin();
        await loadDocuments();
      } catch (error) {
        state.password = "";

        elements.loginMessage.textContent =
          error.message;
      }
    }
  );

  elements.form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const id =
        elements.id.value
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_");

      if (!id) {
        showNotification(
          "Record ID is required.",
          true
        );

        return;
      }

      const payload = {
        id,
        title:
          elements.title.value,

        category:
          elements.category.value,

        scope:
          elements.scope.value,

        status:
          elements.status.value,

        lastReviewed:
          elements.reviewed.value,

        keywords:
          elements.keywords.value
            .split(",")
            .map(
              (keyword) =>
                keyword.trim()
            )
            .filter(Boolean),

        text:
          elements.text.value,

        source:
          elements.source.value,

        active:
          elements.active.checked,
      };

      elements.save.disabled = true;
      elements.saveStatus.textContent =
        "Saving…";

      try {
        const result =
          await apiRequest(
            `/api/admin/documents/${encodeURIComponent(id)}`,
            {
              method: "PUT",

              body:
                JSON.stringify(
                  payload
                ),
            }
          );

        const existingIndex =
          state.documents.findIndex(
            (item) =>
              item.id ===
              result.document.id
          );

        if (existingIndex >= 0) {
          state.documents[
            existingIndex
          ] = result.document;
        } else {
          state.documents.push(
            result.document
          );
        }

        state.documents.sort(
          (first, second) =>
            first.title.localeCompare(
              second.title
            )
        );

        state.selectedId =
          result.document.id;

        state.isNew = false;

        elements.id.readOnly = true;
        elements.editorTitle.textContent =
          result.document.title;

        elements.saveStatus.textContent =
          "Saved";

        renderRecords();

        showNotification(
          result.message ||
            "Knowledge saved and backup created."
        );
      } catch (error) {
        elements.saveStatus.textContent =
          "Save failed";

        showNotification(
          error.message,
          true
        );
      } finally {
        elements.save.disabled = false;
      }
    }
  );

  elements.newRecord.addEventListener(
    "click",
    createNewRecord
  );

  elements.search.addEventListener(
    "input",
    renderRecords
  );

  elements.reset.addEventListener(
    "click",
    () => {
      if (state.isNew) {
        createNewRecord();
        return;
      }

      const document =
        state.documents.find(
          (item) =>
            item.id ===
            state.selectedId
        );

      if (document) {
        displayRecord(document);
      }
    }
  );

  elements.logout.addEventListener(
    "click",
    showLogin
  );

  hideEditor();
})();