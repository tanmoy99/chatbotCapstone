# Knowledge Base Maintenance

## Purpose

The editable IIM content is stored separately from the chatbot code in:

`data/knowledge-base.json`

The file contains the organisation details, approved contacts, official source URLs, 31 knowledge documents, suggested topics, intents and user journeys. `public/knowledge.js` now validates this data and builds the RAG corpus; it should not contain changing IIM facts.

## Safe update process

1. Create a backup or a Git branch before editing the data file.
2. Change only the required record.
3. Keep every knowledge document ID unique and unchanged unless code and tests are also updated.
4. Record an official source URL and review date.
5. Run `npm run test:kb` to validate the data structure.
6. Start the server and check `/api/health`.
7. Run `npm run test:chatbot` before publishing the change.
8. Commit the data change and its test results together.

The Node server must be restarted after a manual change to the JSON file. A future admin dashboard can reload the data automatically after an approved publish action.

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
- Prefer deactivating or replacing an outdated record through the future dashboard instead of silently deleting its history.

## Planned non-technical editor

The next stage is a password-protected Knowledge Management Dashboard. It will provide forms, validation, draft and publish controls, backups and an audit trail so client staff will not need to edit JSON directly.
