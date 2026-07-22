import assert from "node:assert/strict";
import test from "node:test";
import {
  assessCoachingPrompt,
  screenObviousPromptProblems,
  type CoachingPromptStatus,
} from "./coaching-input-quality.ts";

test("rejects keyboard noise without calling OpenAI", async () => {
  let called = false;
  const result = await assessCoachingPrompt("asdfasdfasdf!!!!", "ceo", "test", async () => {
    called = true;
    throw new Error("fetch should not run");
  });

  assert.equal(result.status, "nonsense");
  assert.equal(called, false);
});

test("local screening allows vague, short, and off-topic wording", () => {
  assert.equal(screenObviousPromptProblems("help me"), null);
  assert.equal(screenObviousPromptProblems("What should I do?"), null);
  assert.equal(screenObviousPromptProblems("How do I improve enrollment?"), null);
  assert.equal(screenObviousPromptProblems("What color should I paint my kitchen?"), null);
  assert.equal(screenObviousPromptProblems("Tell me about marketing"), null);
  assert.equal(screenObviousPromptProblems("I feel overwhelmed"), null);
  assert.equal(screenObviousPromptProblems("Why are my teachers always late?"), null);
  assert.equal(screenObviousPromptProblems("stuff"), null);
});

test("allows a broad but legitimate childcare business question", async () => {
  const result = await assessCoachingPrompt(
    "How do I improve enrollment?",
    "revenue",
    "test",
    classifierResponse("actionable", "The text has a clear semantic interpretation."),
  );

  assert.equal(result.status, "actionable");
  assert.equal(result.message, null);
});

test("allows a subjectless but understandable question", async () => {
  const result = await assessCoachingPrompt(
    "What should I do about the problem?",
    "ceo",
    "test",
    classifierResponse("actionable", "The question is vague but understandable."),
  );

  assert.equal(result.status, "actionable");
  assert.equal(result.message, null);
});

test("allows a concise prompt with concrete facts and a decision", async () => {
  const result = await assessCoachingPrompt(
    "Enrollment fell from 92 to 78 in 60 days while tour volume stayed flat. What should I audit first?",
    "revenue",
    "test",
    classifierResponse(
      "actionable",
      "The prompt provides a measurable decline, timeframe, and stable tour volume.",
    ),
  );

  assert.equal(result.status, "actionable");
  assert.equal(result.message, null);
});

test("allows coherent requests regardless of topic", async () => {
  const result = await assessCoachingPrompt(
    "What color should I paint my kitchen cabinets?",
    "ceo",
    "test",
    classifierResponse("actionable", "The request is coherent."),
  );

  assert.equal(result.status, "actionable");
  assert.equal(result.message, null);
});

test("rejects semantic word salad", async () => {
  const result = await assessCoachingPrompt(
    "banana staffing river 123 sparkle",
    "ceo",
    "test",
    classifierResponse("nonsense", "The words do not form a decipherable statement or request."),
  );

  assert.equal(result.status, "nonsense");
  assert.match(result.message ?? "", /could not understand/i);
});

test("fails closed when the quality service is unavailable", async () => {
  await assert.rejects(
    assessCoachingPrompt(
      "Our tours dropped 40% this month. What should I review?",
      "marketing",
      "test",
      async () => new Response("unavailable", { status: 503 }),
    ),
    /quality check failed/i,
  );
});

function classifierResponse(
  status: CoachingPromptStatus,
  reason: string,
) {
  return async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              tool_calls: [
                {
                  function: {
                    arguments: JSON.stringify({
                      status,
                      reason,
                    }),
                  },
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
}
