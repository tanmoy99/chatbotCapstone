# Knowledge Base Maintenance

## Purpose

The editable IIM content is stored separately from the chatbot code in:

`data/knowledge-base.json`

The file contains the organisation details, approved contacts, official source URLs, knowledge documents, suggested topics, intents and user journeys. `public/knowledge.js` now validates this data and builds the RAG corpus; it should not contain changing IIM facts.

## Safe update process

1. Create a backup or a Git branch before editing the data file.
2. Change only the required record.
3. Keep every knowledge document ID unique and unchanged unless code and tests are also updated.
4. Record an official source URL and review date.
5. Run `npm run test:kb` to validate the data structure.
6. Start the server and check `/api/health`.
7. Run `npm run test:chatbot` before publishing the change.
8. Commit the data change and its test results together.

Admin dashboard saves take effect immediately: the server rebuilds the knowledge base in memory after each save. If the running chatbot rejects the new data, the previous file is restored and the dashboard shows the error. Manual edits to the JSON file still need a server restart. `npm run test:kb` validates the current data, and `/api/health` reports the number of loaded documents.

## Production knowledge file

In the repository, `data/knowledge-base.json` is the seed content. On a live server, set `KNOWLEDGE_DATA_PATH` to a file outside the git checkout, for example `/var/lib/iim-chatbot/knowledge-base.json`. On first start the server copies the seed there. After that, admin edits go to that file, and backups go to a `backups/` folder beside it, so `git pull` never overwrites or conflicts with staff changes.

When seed content changes in git after launch, those changes don't reach the live file automatically. Apply them through the admin dashboard, or merge them into the live file deliberately.

## Knowledge document fields

| Field | Meaning |
| --- | --- |
| `id` | Permanent source identifier used by retrieval and automated tests |
| `scope` | Country, region or system scope |
| `category` | Retrieval category such as membership, certification or contact |
| `title` | Short record name shown in audit information |
| `status` | Review and usage state |
| `lastReviewed` | Date the official source was checked |
| `keywords` | Search terms and common question wording |
| `text` | Approved content supplied to the chatbot |
| `source` | Primary official IIM URL |
| `secondarySource` | Optional second official source |
| `liveListSource` | Optional live page for changing lists |

## Allowed status values

| Status | Use |
| --- | --- |
| `stable` | Verified information that can be reviewed periodically |
| `dynamic` | Information such as fees that must be rechecked regularly |
| `live` | Information that should be confirmed using the current official page |
| `verify` | Conflicting or uncertain information awaiting client confirmation |

## Important controls

- Do not remove source IDs used by tests without updating the relevant test cases.
- Do not publish private client or user information in the knowledge file.
- Do not replace a verified record with information from an unofficial source.
- Do not treat dynamic or live information as permanently correct.
- Prefer deactivating or replacing an outdated record through the admin dashboard instead of silently deleting its history.

## Knowledge management interface

The password-protected dashboard at `/admin/` supports document loading, editing, creation and deactivation. Set `ADMIN_PASSWORD` in the ignored `.env` file. Saves validate the document, create a backup in the ignored `backups/` folder next to the knowledge file, and go live without a restart. Draft/publish controls and a full audit trail remain future work.

## Local startup

Copy `.env.example` to `.env`, configure the admin password, and run `npm start`. The default URL is `http://localhost:3100`; `PORT` can override it. Ollama defaults to `llama3.2:3b`. The browser sends knowledge questions to `/api/chat`; the backend handles lexical retrieval, grounded templates, Ollama and rule-based fallback. Built-in conversation and a browser rule-based fallback remain available if the backend request fails.
