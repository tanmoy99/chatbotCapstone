# IIM AI Assistant — Baseline Notes

## 1. Baseline identification

- **Project:** IIM AI Assistant chatbot
- **Repository:** https://github.com/tanmoy99/chatbotCapstone
- **Baseline date:** 19 August 2026
- **Git tag:** `v0.1-baseline`
- **Purpose:** Preserve the current system state before the next RAG and response-quality improvements.

## 2. Current system overview

The project is a web-based AI assistant for the Institute of Information Management (IIM). It answers questions about membership, certification, CDPO, CPD, training, publications, services, privacy, events, office locations and official contacts.

The current request flow is:

1. The user submits a question through the chatbot interface.
2. The frontend sends the question to `POST /api/chat`.
3. The RAG module normalises the query, expands relevant terms and scores the approved knowledge documents.
4. The server selects the strongest knowledge chunks when the retrieval score is considered reliable.
5. The system uses either a grounded response template or the local Llama model with the retrieved context.
6. If no reliable knowledge is found, the server returns a controlled fallback answer instead of asking the model to guess.
7. The response includes source and retrieval metadata for evaluation.

## 3. Baseline technology

| Component | Baseline configuration |
| --- | --- |
| Backend | Node.js and Express |
| Local LLM service | Ollama |
| Configured model | `llama3.2:3b` |
| Model temperature | `0` |
| Chat endpoint | `POST /api/chat` |
| Health endpoint | `GET /api/health` |
| Test base URL | `http://127.0.0.1:3100` |
| Knowledge storage | `public/knowledge.js` |
| Retrieval logic | `public/rag.js` |
| Offline response engine | `public/engine.js` |
| Automated test runner | `scripts/run-tests.js` |

## 4. Knowledge-base baseline

The current knowledge base contains:

- **31 knowledge documents**
- **28 verified documents**
- **12 knowledge categories**
- Unique source identifiers for automated source checking
- Verification states for stable, dynamic, live and uncertain information
- Approved departmental contact information
- Review dates and official IIM source references

Information such as fees, events, provider accreditation and training schedules is treated as dynamic because it may change. Conflicting or uncertain information, including the Lagos street number and expired-CDPO rules, is presented cautiously and directed to an official IIM contact.

## 5. RAG and response controls

The baseline RAG system uses lexical retrieval rather than a vector database. It applies query normalisation, query expansion, phrase and keyword matching, weighted relevance scoring and confidence gating.

A retrieval result is currently treated as reliable when:

- confidence is at least `0.45`; and
- the top retrieval score is at least `18`.

A high-precision intent rule gives the expired-CDPO policy priority when the original question clearly refers to CDPO expiry.

Grounded response templates are used for selected high-risk facts:

- Professional Membership and PMIIM fees
- Expired CDPO policy
- Lagos office address conflict

The system prompt also prevents the model from renaming IIM abbreviations or inventing contact details. Only approved contacts supplied through the knowledge context may be used.

## 6. Automated evaluation method

Each automated test sends one question to `/api/chat` and checks:

- required factual terms or accepted alternatives;
- prohibited or unsupported claims;
- expected knowledge-source identifiers; and
- whether fallback behaviour was correct.

The test runner writes the complete output to `tests/latest-results.json`.

## 7. Baseline test results

| Test suite | Result | Pass rate |
| --- | ---: | ---: |
| Core regression suite | 6/6 | 100.0% |
| Expanded FAQ suite | 50/60 | 83.3% |

The expanded evaluation originally reported 39/60. Review of the answers found that eleven failures were caused by overly strict wording checks or substring matching in the tests. For example, the forbidden word `rain` was incorrectly detected inside the word `training`. After correcting those test-design problems without changing the chatbot answers, the fair expanded baseline became 50/60.

The 83.3% result is an automated pass rate on the selected 60-question dataset. It must not be described as proof that the chatbot can correctly answer 83.3% of every possible user question.

## 8. Genuine problems identified

The expanded evaluation identified ten genuine system weaknesses:

1. The IIM mission question incorrectly activates fallback.
2. Professional Membership eligibility retrieves the membership-category document instead of the eligibility document.
3. Fellow Membership retrieves the wrong membership document.
4. CDPO eligibility retrieves the general CDPO overview.
5. CDPO validity does not retrieve the re-certification document.
6. The missing-CPD answer does not provide enough escalation guidance.
7. Training-date and pricing questions retrieve the wrong source.
8. The Australia office answer omits the approved phone number.
9. The South Africa answer omits the approved address.
10. A general office-locations question retrieves only the Ibadan office instead of combining the relevant office documents.

## 9. Work completed during this baseline cycle

- Updated tests to match the revised knowledge-base source IDs.
- Added accepted USD formats for fee evaluation.
- Improved expired-CDPO document ranking.
- Added stricter reliability checks for unsupported questions.
- Added controlled responses for PMIIM fees, expired CDPO and the Lagos address conflict.
- Prevented invented abbreviations and unapproved contact details.
- Changed the model temperature to zero for more consistent responses.
- Expanded the automated evaluation from 6 to 60 questions.
- Corrected eleven unfair or faulty checks in the expanded test suite.
- Saved the 6/6 core result and the 50/60 expanded baseline result.

## 10. Client confirmation still required

The following information should be confirmed with the client before production release:

- Whether CIM certification exists or was a naming error
- A complete approved FAQ list beyond the public CDPO renewal FAQ
- Current training schedules and prices
- The correct destination for escalated conversations
- Topics that must always be transferred to a human
- The production website platform and responsible technical contact
- Preferred chatbot name and tone
- The person responsible for approving chatbot answers
- Final data-privacy and retention requirements

## 11. Baseline limitations

- The expanded dataset contains only 60 curated questions.
- Automated checks depend partly on accepted text phrases.
- The same dataset will be used during the next development cycle, so it is a development suite rather than an independent final evaluation.
- The local 3B model may omit facts even when the correct document is retrieved.
- Live information cannot be guaranteed without current website or API access.
- Human evaluation has not yet been completed.

## 12. Next development actions

1. Commit the baseline code, corrected test suite and saved results.
2. Create and push the `v0.1-baseline` Git tag.
3. Improve intent-aware retrieval for the ten genuine failures.
4. Add grounded handling for exact office contacts and incomplete-policy questions.
5. Rerun the same 60-question suite and compare it with the 50/60 baseline.
6. Create 10–15 unseen questions for independent validation.
7. Conduct human review of correctness, groundedness and usefulness before the final report.

## 13. Baseline evidence files

The following evidence should be retained in the repository:

- `tests/test-cases-core.json`
- `tests/results-core-6-of-6.json`
- `tests/test-cases.json`
- `tests/results-expanded-baseline-50-of-60.json`
- `docs/baseline-notes.md`
