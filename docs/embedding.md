# Embedding the assistant on another website

The assistant can appear as a floating chat button on another site, such as the main IIM website. Clicking the button opens the chatbot in a panel; on phones the panel fills the screen.

## 1. Allow the website

On the chatbot server, list the sites that may show it, separated by spaces, in `.env`:

```
EMBED_ALLOWED_ORIGINS=https://iim-africa.org https://www.iim-africa.org
```

Use the exact scheme and host the visitor sees in the address bar, without a path. `www` and non-`www` are different origins, so list both if both are used. Restart the server after changing it.

Sites that are not listed cannot frame the chatbot. The browser refuses to show it.

## 2. Add the script to the website

Paste this before `</body>` on every page that should show the button. On WordPress, a header/footer code plugin or the theme's footer works.

```html
<script src="https://myiim.network/embed.js" defer></script>
```

Optional settings on the same tag:

| Attribute | Effect |
| --- | --- |
| `data-position="left"` | Put the button bottom-left instead of bottom-right |
| `data-label="Ask IIM"` | Change the button's tooltip and screen-reader label |

## How it works

- `embed.js` adds a button and, on first click, an iframe showing `https://myiim.network/?embed=1`.
- `?embed=1` switches the chatbot to a compact layout without the sidebar.
- Chats, ratings and the knowledge base are the same as on myiim.network. Ratings made through the widget are marked "embedded widget" in the admin Feedback view.

## If the button appears but the panel is blank

- The site's origin is missing from `EMBED_ALLOWED_ORIGINS`, or the server wasn't restarted after it was added. The browser console shows a `frame-ancestors` error.
- The website has its own Content-Security-Policy. It must allow `https://myiim.network` in `script-src` and `frame-src`.
