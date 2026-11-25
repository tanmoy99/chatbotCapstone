# IIM AI Assistant

A website chatbot for the Institute of Information Management (IIM). It answers questions about membership, certification (including CDPO), CPD, training, events and contacts using only IIM's approved knowledge. When it can't answer, it hands the visitor over to IIM staff.

Live at `https://myiim.network` (once deployed). See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## What it does

- **Grounded answers.** Every answer comes from `data/knowledge-base.json`. If no reliable knowledge matches, the assistant says so instead of guessing.
- **Checked wording for high-risk facts.** Fees, membership grades and similar facts use fixed templates, so the model can't misstate them.
- **Streaming.** Answers appear word by word as the local model writes them.
- **Contact a human.** Visitors can send IIM an enquiry from the chat (saved for staff and emailed via SMTP) or open email or WhatsApp directly.
- **Ratings.** Thumbs up/down are saved with the question and answer, so IIM can see weak answers.
- **Admin dashboard** at `/admin/`: edit knowledge (live immediately), track enquiries, review ratings and export them as CSV.
- **Embeddable.** One script tag adds a floating chat button to another site. See [docs/embedding.md](docs/embedding.md).
- **Keeps working without the model.** If Ollama is down, answers come from templates and a rule-based engine.

## How an answer is produced

1. The browser sends the question (and the last few turns) to `POST /api/chat`.
2. `query-intents.js` recognises common question types and focuses the search.
3. `public/rag.js` scores the knowledge documents and decides whether the best match is reliable.
4. The server then either:
   - returns a checked template for high-risk facts,
   - asks the local Llama model (via Ollama) to answer from the matched documents only, streaming the reply, or
   - says it can't confirm the answer and offers IIM contacts.
5. The answer is cleaned (formatting, acronym check), shown with its sources, and can be rated.

## Run it locally

Requirements: Node.js 20.3 or later. [Ollama](https://ollama.com) with `llama3.2:3b` is optional; without it the rule-based answers are used.

```bash
npm install
cp .env.example .env        # then set ADMIN_PASSWORD
ollama pull llama3.2:3b     # optional
npm start                   # http://localhost:3100
```

Every setting is explained in [.env.example](.env.example).

## Tests

```bash
npm test               # all automated suites (about 1 minute)
npm run test:chatbot   # 75 real questions against a running server and model
```

`npm test` covers knowledge-base validation, retrieval, answer formatting, conversation context, the Ollama-outage fallback, streaming and caching (with a fake model), feedback, enquiries, the admin API and the deployment safeguards.

`test:chatbot` needs the server running (`npm start`) and checks real model answers for required facts, forbidden claims and sources. Results are saved to `tests/latest-results.json`. Set `CHAT_RATE_LIMIT_PER_MINUTE=0` while running it.

## Project layout

| Path | Purpose |
| --- | --- |
| `server.js` | Express server: chat endpoint, streaming, model calls, security headers |
| `query-intents.js` | Recognises question types (membership, training, refunds, ...) |
| `admin-api.js` | Password-protected knowledge editing |
| `feedback-api.js` | Answer ratings |
| `enquiry-api.js` | Visitor enquiries and email |
| `public/` | Chat page, admin dashboard, `embed.js`, retrieval (`rag.js`) and fallback engine |
| `data/knowledge-base.json` | Approved IIM knowledge (seed copy; see maintenance guide) |
| `deploy/` | VPS setup, update and backup scripts; nginx and pm2 config |
| `docs/` | Deployment, embedding and knowledge maintenance guides |
| `tests/` | Automated tests and chatbot question set |

## Documentation

- [Deployment](docs/DEPLOYMENT.md)
- [Knowledge base maintenance](docs/knowledge-base-maintenance.md)
- [Embedding on another website](docs/embedding.md)
- [Baseline notes (August 2026 snapshot)](docs/baseline-notes.md)
