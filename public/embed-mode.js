/*
 * Runs in <head> before the page renders. When the chatbot is
 * opened by embed.js (?embed=1), switch to the compact layout
 * without a flash of the full page.
 */
(function () {
  "use strict";

  try {
    if (new URLSearchParams(window.location.search).get("embed") === "1") {
      document.documentElement.classList.add("embed");
    }
  } catch (error) {
    /* Older browsers simply get the full layout. */
  }
})();
