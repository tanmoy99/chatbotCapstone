# Chatbot MVP — Test Scenarios & Evaluation (Objective 3)

Run each scenario in `chatbot/index.html`. Record: intent hit, answer correct (Y/N),
contained (resolved without human handoff Y/N), and notes. Targets: accuracy ≥ 85%,
containment ≥ 80%, task completion ≥ 90%.

## A. Certification (core value)

| # | Persona | Input | Expected intent | Pass criteria |
|---|---------|-------|-----------------|---------------|
| 1 | Professional | "What certifications do you offer?" | certification_overview | Lists CDPO + CIM® |
| 2 | Professional | "Tell me about CDPO" | cdp_certification | Describes privacy/DPO credential |
| 3 | Student | "What is CIM?" | cim_certification | Describes info manager credential |
| 4 | Professional | "How do I get certified?" | how_to_certify | 5-step path shown |
| 5 | Corporate | "What are the exam fees?" | exam_info | Deflects to human with contact (no fake fee) |
| 6 | Professional | "What are the requirements for CDPO?" | how_to_certify / cdp | Points to eligibility + human |

## B. Membership, Training, Events, Advisory

| # | Persona | Input | Expected intent | Pass criteria |
|---|---------|-------|-----------------|---------------|
| 7 | Corporate | "How do I become a member?" | membership_info | Benefits + handoff |
| 8 | Student | "Do you have training courses?" | training_programs | Mentions prep + corporate/NGO |
| 9 | Professional | "When is your next conference?" | events_conferences | Mentions events + contact |
| 10 | Government | "Can you advise on our data policy?" | advisory_services | Routes to advisor |
| 11 | NGO | "Do you support capacity building?" | training_programs | NGO capacity building mentioned |

## C. Engagement, Fallback, Escalation

| # | Persona | Input | Expected intent | Pass criteria |
|---|---------|-------|-----------------|---------------|
| 12 | Any | "hello" | greeting | Greets + suggests topics |
| 13 | Any | "asdfghjkl" | fallback | Clarifies + offers topics |
| 14 | Any | "speak to a person" | contact_human | Shows email/phone + logs escalation |
| 15 | Any | "what is your refund policy?" | fallback/contact | Doesn't invent policy; offers human |

## D. Accessibility & Usability checks

- [ ] Keyboard only: tab to input, type, Enter sends, quick-reply buttons reachable.
- [ ] Screen reader announces new bot messages (aria-live region).
- [ ] Contrast meets WCAG 2.1 AA on header/buttons.
- [ ] Persona selector pre-fills a sensible starter question.

## E. Scorecard template

```
Scenario | Intent | Correct | Contained | Score(1-5) | Notes
1        |        |         |           |            |
...
Summary: Accuracy __%  Containment __%  Avg usability __/5
```
