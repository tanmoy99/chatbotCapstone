/*
 * IIM Assistant: floating chat button for other websites.
 *
 * Add to any page on a site listed in EMBED_ALLOWED_ORIGINS:
 *
 *   <script src="https://myiim.network/embed.js" defer></script>
 *
 * Optional attributes on the script tag:
 *   data-position="left"        button on the bottom-left (default right)
 *   data-label="Ask IIM"        accessible label and tooltip
 *
 * Styles are set through element.style so the widget works
 * on sites whose Content-Security-Policy blocks inline <style>.
 */
(function () {
  "use strict";

  if (window.__iimAssistantLoaded) {
    return;
  }
  window.__iimAssistantLoaded = true;

  var script =
    document.currentScript ||
    document.querySelector('script[src*="embed.js"]');

  if (!script) {
    return;
  }

  var origin = new URL(script.src, window.location.href).origin;
  var side = script.getAttribute("data-position") === "left" ? "left" : "right";
  var label = script.getAttribute("data-label") || "Chat with the IIM Assistant";

  var CHAT_ICON =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M4 6h16v10H8l-4 4V6Z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<path d="M8 10h8M8 13h5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>';

  var CLOSE_ICON =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M6 6l12 12M18 6 6 18" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>';

  function setStyles(element, styles) {
    for (var name in styles) {
      if (Object.prototype.hasOwnProperty.call(styles, name)) {
        element.style[name] = styles[name];
      }
    }
  }

  var button = document.createElement("button");
  button.type = "button";
  button.innerHTML = CHAT_ICON;
  button.title = label;
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", "iim-assistant-panel");
  setStyles(button, {
    position: "fixed",
    bottom: "20px",
    width: "60px",
    height: "60px",
    padding: "0",
    border: "none",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #22d3ee 0%, #6366f1 50%, #a855f7 100%)",
    boxShadow: "0 8px 28px rgba(15, 23, 42, 0.35)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "2147483000",
    transition: "transform 0.2s ease",
  });
  button.style[side] = "20px";

  var panel = document.createElement("div");
  panel.id = "iim-assistant-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "IIM Assistant");
  setStyles(panel, {
    position: "fixed",
    display: "none",
    overflow: "hidden",
    background: "#070b18",
    boxShadow: "0 18px 60px rgba(15, 23, 42, 0.45)",
    zIndex: "2147483001",
  });

  var frame = null;
  var isOpen = false;

  function layoutPanel() {
    var small = window.matchMedia("(max-width: 520px)").matches;

    if (small) {
      setStyles(panel, {
        top: "0",
        bottom: "0",
        left: "0",
        right: "0",
        width: "100%",
        height: "100%",
        borderRadius: "0",
      });
    } else {
      setStyles(panel, {
        top: "auto",
        bottom: "92px",
        left: "auto",
        right: "auto",
        width: "400px",
        height: "min(640px, calc(100vh - 120px))",
        borderRadius: "18px",
      });
      panel.style[side] = "20px";
    }

    /* On small screens the panel fills the screen, so the
       button shrinks and moves to the top corner above it
       to stay available as the close control. */
    button.style.zIndex = small ? "2147483002" : "2147483000";
    button.style.bottom = small && isOpen ? "auto" : "20px";
    button.style.top = small && isOpen ? "12px" : "auto";
    button.style.width = small && isOpen ? "44px" : "60px";
    button.style.height = small && isOpen ? "44px" : "60px";
  }

  function open() {
    if (!frame) {
      frame = document.createElement("iframe");
      frame.src = origin + "/?embed=1";
      frame.title = "IIM Assistant chat";
      frame.setAttribute("allow", "clipboard-write");
      setStyles(frame, {
        width: "100%",
        height: "100%",
        border: "0",
        display: "block",
      });
      panel.appendChild(frame);
    }

    isOpen = true;
    panel.style.display = "block";
    button.innerHTML = CLOSE_ICON;
    button.setAttribute("aria-expanded", "true");
    button.setAttribute("aria-label", "Close the IIM Assistant");
    layoutPanel();
    frame.focus();
  }

  function close() {
    isOpen = false;
    panel.style.display = "none";
    button.innerHTML = CHAT_ICON;
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", label);
    layoutPanel();
    button.focus();
  }

  button.addEventListener("click", function () {
    if (isOpen) {
      close();
    } else {
      open();
    }
  });

  button.addEventListener("mouseenter", function () {
    button.style.transform = "scale(1.06)";
  });

  button.addEventListener("mouseleave", function () {
    button.style.transform = "none";
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isOpen) {
      close();
    }
  });

  window.addEventListener("resize", layoutPanel);

  function mount() {
    document.body.appendChild(panel);
    document.body.appendChild(button);
    layoutPanel();
  }

  if (document.body) {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount);
  }
})();
