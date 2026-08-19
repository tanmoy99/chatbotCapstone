"use strict";

const fs = require("fs");
const path = require("path");

const BASE_URL =
  process.env.TEST_BASE_URL ||
  "http://localhost:3000";

const TEST_FILE = path.join(
  __dirname,
  "..",
  "tests",
  "test-cases.json"
);

const tests = JSON.parse(
  fs.readFileSync(TEST_FILE, "utf8")
);

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function checkRequiredGroups(
  answer,
  requiredGroups
) {
  const normalizedAnswer =
    normalize(answer);

  const failedGroups = [];

  for (const group of requiredGroups || []) {
    const found = group.some((term) =>
      normalizedAnswer.includes(
        normalize(term)
      )
    );

    if (!found) {
      failedGroups.push(group);
    }
  }

  return {
    passed: failedGroups.length === 0,
    failedGroups,
  };
}

function checkForbiddenTerms(
  answer,
  forbiddenTerms
) {
  const normalizedAnswer =
    normalize(answer);

  const foundTerms = (
    forbiddenTerms || []
  ).filter((term) =>
    normalizedAnswer.includes(
      normalize(term)
    )
  );

  return {
    passed: foundTerms.length === 0,
    foundTerms,
  };
}

function checkSources(
  responseData,
  expectedSourceIds
) {
  if (
    !expectedSourceIds ||
    expectedSourceIds.length === 0
  ) {
    return {
      passed: true,
      missingSources: [],
    };
  }

  const retrievedDocuments =
    responseData.meta &&
    Array.isArray(
      responseData.meta
        .retrievedDocuments
    )
      ? responseData.meta
          .retrievedDocuments
      : [];

  const retrievedIds =
    retrievedDocuments.map(
      (document) => document.id
    );

  const missingSources =
    expectedSourceIds.filter(
      (sourceId) =>
        !retrievedIds.includes(
          sourceId
        )
    );

  return {
    passed:
      missingSources.length === 0,

    missingSources,
  };
}

async function runTest(test) {
  const response = await fetch(
    BASE_URL + "/api/chat",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        message: test.question,
        history: [],
      }),
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
      `HTTP ${response.status}`
    );
  }

  const requiredCheck =
    checkRequiredGroups(
      data.answer,
      test.requiredGroups
    );

  const forbiddenCheck =
    checkForbiddenTerms(
      data.answer,
      test.forbiddenTerms
    );

  const sourceCheck =
    checkSources(
      data,
      test.expectedSourceIds
    );

  const actualFallback =
    Boolean(
      data.meta &&
      data.meta.fallback
    );

  const fallbackPassed =
    actualFallback ===
    Boolean(test.expectFallback);

  const passed =
    requiredCheck.passed &&
    forbiddenCheck.passed &&
    sourceCheck.passed &&
    fallbackPassed;

  return {
    id: test.id,
    question: test.question,
    passed,
    answer: data.answer,
    requiredCheck,
    forbiddenCheck,
    sourceCheck,
    fallbackPassed,
    actualFallback,
  };
}

async function main() {
  let passedCount = 0;
  const results = [];

  console.log(
    `Running ${tests.length} chatbot tests...\n`
  );

  for (const test of tests) {
    try {
      const result =
        await runTest(test);

      results.push(result);

      if (result.passed) {
        passedCount += 1;

        console.log(
          `PASS: ${test.id}`
        );
      } else {
        console.log(
          `FAIL: ${test.id}`
        );

        if (
          !result.requiredCheck.passed
        ) {
          console.log(
            "  Missing facts:",
            result.requiredCheck
              .failedGroups
          );
        }

        if (
          !result.forbiddenCheck.passed
        ) {
          console.log(
            "  Unsupported facts:",
            result.forbiddenCheck
              .foundTerms
          );
        }

        if (
          !result.sourceCheck.passed
        ) {
          console.log(
            "  Missing sources:",
            result.sourceCheck
              .missingSources
          );
        }

        if (
          !result.fallbackPassed
        ) {
          console.log(
            "  Incorrect fallback behaviour"
          );
        }
      }
    } catch (error) {
      console.log(
        `ERROR: ${test.id}`
      );

      console.log(
        " ",
        error.message
      );
    }
  }

  const accuracy =
    tests.length > 0
      ? (
          passedCount /
          tests.length
        ) * 100
      : 0;

  console.log("\n--------------------");

  console.log(
    `Passed: ${passedCount}/${tests.length}`
  );

  console.log(
    `Accuracy: ${accuracy.toFixed(1)}%`
  );

  console.log("--------------------");

  const outputFile =
    path.join(
      __dirname,
      "..",
      "tests",
      "latest-results.json"
    );

  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      {
        runAt:
          new Date().toISOString(),

        passed:
          passedCount,

        total:
          tests.length,

        accuracy,

        results,
      },
      null,
      2
    )
  );

  console.log(
    `Results saved to ${outputFile}`
  );
}

main().catch((error) => {
  console.error(
    "Test runner failed:",
    error
  );

  process.exitCode = 1;
});