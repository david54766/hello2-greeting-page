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

test("rejects generic filler locally", () => {
  const result = screenObviousPromptProblems("help me");
  assert.equal(result?.status, "needs_clarification");
  assert.match(result?.message ?? "", /more context/i);
});

test("requires clarification for a recognizable but vague topic", async () => {
  const result = await assessCoachingPrompt(
    "How do I improve enrollment?",
    "revenue",
    "test",
    classifierResponse(
      "needs_clarification",
      "No current enrollment, capacity, funnel stage, or recent trend was supplied.",
      "What is your current enrollment versus capacity, and where are prospects dropping off: inquiry, tour, or close?",
    ),
  );

  assert.equal(result.status, "needs_clarification");
  assert.match(result.message ?? "", /current enrollment versus capacity/i);
});

test("allows a concise prompt with concrete facts and a decision", async () => {
  const result = await assessCoachingPrompt(
    "Enrollment fell from 92 to 78 in 60 days while tour volume stayed flat. What should I audit first?",
    "revenue",
    "test",
    classifierResponse(
      "actionable",
      "The prompt provides a measurable decline, timeframe, and stable tour volume.",
      null,
    ),
  );

  assert.equal(result.status, "actionable");
  assert.equal(result.message, null);
});

test("rejects coherent requests outside childcare business strategy", async () => {
  const result = await assessCoachingPrompt(
    "What color should I paint my kitchen cabinets?",
    "ceo",
    "test",
    classifierResponse("out_of_scope", "The request concerns residential interior design.", null),
  );

  assert.equal(result.status, "out_of_scope");
  assert.match(result.message ?? "", /childcare business strategy/i);
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
  clarificationQuestion: string | null,
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
                      clarification_question: clarificationQuestion,
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
