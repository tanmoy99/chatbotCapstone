"use strict";

const assert = require("assert");
const { startServer } = require("../server");

async function chat(baseUrl, message, history = [], conversationId = "context-regression-session") {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, conversationId }),
  });
  assert.strictEqual(response.status, 200);
  return response.json();
}

function addTurn(history, user, result) {
  return [...history, { role: "user", content: user }, { role: "assistant", content: result.answer }];
}

(async () => {
  const server = startServer(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    let history = [];
    const courses = await chat(baseUrl, "Does IIM offer courses?", history);
    assert(courses.answer.includes("Database Management"));
    assert(/\n- Archiving and Preservation\n/.test(courses.answer));
    assert(!courses.answer.includes("\\*"));
    history = addTurn(history, "Does IIM offer courses?", courses);

    const recommendation = await chat(baseUrl, "I am an IT student. Which one would be good for me?", history);
    assert(recommendation.answer.includes("Information Security"));
    assert(recommendation.answer.includes("Database Management"));
    assert(!/STIIM.*course/i.test(recommendation.answer));
    assert.deepStrictEqual(recommendation.meta.retrievedDocuments.map((item) => item.id), ["training_areas"]);
    history = addTurn(history, "I am an IT student. Which one would be good for me?", recommendation);

    const ambiguousFee = await chat(baseUrl, "What is the fee for that course?", history);
    assert(/which course/i.test(ambiguousFee.answer), ambiguousFee.answer);
    assert(!ambiguousFee.meta.retrievedDocuments.some((item) => item.id === "ng_membership_fees"));

    history = addTurn(history, "Information Security", { answer: "You selected Information Security." });
    const selectedFee = await chat(baseUrl, "How much is that course?", history);
    assert(selectedFee.answer.includes("training@iim-africa.org"));
    assert(!/USD\s*\d/i.test(selectedFee.answer));
    assert(!selectedFee.meta.retrievedDocuments.some((item) => item.id === "ng_membership_fees"));

    const eligibility = await chat(baseUrl, "Who is eligible for STIIM?");
    assert(/full-time students/i.test(eligibility.answer));
    assert(/proof of active study/i.test(eligibility.answer));

    const fees = await chat(baseUrl, "What are the STIIM fees in Nigeria?");
    assert(/registration fee/i.test(fees.answer) && /USD 50/i.test(fees.answer));

    for (const question of ["What are the benefits of STIIM?", "What are the benifits of STIIM?"]) {
      const benefits = await chat(baseUrl, question);
      const ids = benefits.meta.retrievedDocuments.map((item) => item.id);
      assert(ids.includes("membership_benefits"));
      assert(ids.includes("ng_membership_grade_eligibility"));
      assert(/general IIM membership benefits/i.test(benefits.answer));
    }

    const joining = await chat(baseUrl, "I am a student. Can I join IIM?");
    assert(/application and IIM approval/i.test(joining.answer));
    assert(joining.meta.retrievedDocuments.some((item) => item.id === "ng_membership_grade_eligibility"));

    for (const question of [
      "I am an IT student, suggest me a course",
      "I am a IT studnt, suggest me a corse",
    ]) {
      const standalone = await chat(baseUrl, question, []);
      assert(standalone.answer.includes("Information Security"));
      assert(standalone.answer.includes("Database Management"));
      assert(!/Student Member|STIIM|membership@/i.test(standalone.answer));
      assert.deepStrictEqual(standalone.meta.retrievedDocuments.map((item) => item.id), ["training_areas"]);
    }

    for (const previous of [[], history]) {
      for (const question of ["what membership IIM offers", "What membership types are available?"]) {
        const result = await chat(baseUrl, question, previous);
        assert(/Student/i.test(result.answer) && /Individual/i.test(result.answer) && /Corporate/i.test(result.answer));
        assert(!/Being a student|full-time students/i.test(result.answer));
        assert.deepStrictEqual(result.sources, ["Nigeria Membership Categories and Grades"]);
      }
    }
    const generalJoining = await chat(baseUrl, "How do I join IIM?");
    assert(/Student, Individual and Corporate/.test(generalJoining.answer));
    assert(!/Being a student/.test(generalJoining.answer));
    const generalBenefits = await chat(baseUrl, "What are the membership benefits?");
    assert(generalBenefits.sources.includes("Membership Benefits"));
    assert(!/Being a student/.test(generalBenefits.answer));
    const professionalFees = await chat(baseUrl, "How much is PMIIM membership?");
    assert(/USD 180/.test(professionalFees.answer));
    const professionalEligibility = await chat(baseUrl, "What are the Professional Membership requirements?");
    assert(!/Being a student/.test(professionalEligibility.answer));
    const overview = await chat(baseUrl, "what courses IIM offers");
    assert(!/^Yes\./.test(overview.answer));
    const cdpo = await chat(baseUrl, "I'm a data protection officer. Which certification fits me?");
    assert(/CDPO/.test(cdpo.answer));
    assert(!/biometric|marketing|privacy policy/i.test(cdpo.answer));
    assert.deepStrictEqual(cdpo.sources, ["Certified Data Protection Officer (CDPO)"]);

    const fresh = await chat(baseUrl, "Which one is good for me?", []);
    assert(!/Information Security.*Database Management/i.test(fresh.answer));
    console.log("Conversation context regression tests passed.");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
