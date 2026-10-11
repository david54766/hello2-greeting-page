import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStrategyResponse, strategyKey } from './strategy-validation.ts';

const valid = { diagnosis: 'Diagnosis', impact: 'Impact', strategic_move: 'Move', elevation: 'Goal', action_steps: ['First', 'Second', 'Third'] };
test('accepts complete structured responses and discards extra fields', () => {
  assert.deepEqual(parseStrategyResponse(JSON.stringify({ ...valid, unexpected: 'ignore' })), valid);
});
test('rejects missing fields, invalid JSON and non-object responses before persistence', () => {
  for (const input of ['null', '[]', '{}', '{', JSON.stringify({ ...valid, diagnosis: ' ' })]) {
    assert.throws(() => parseStrategyResponse(input));
  }
});
test('rejects missing, blank and invalid action steps', () => {
  for (const action_steps of [[], ['One'], ['a', '', 'c'], ['a', 2, 'c'], Array(6).fill('Step')]) {
    assert.throws(() => parseStrategyResponse(JSON.stringify({ ...valid, action_steps })));
  }
});
test('uses canonical secret before historical aliases and skips blanks', () => {
  assert.equal(strategyKey((name) => ({ OPENAI_API_KEY: ' primary ', OPEN_API_KEY: 'legacy' })[name]), 'primary');
  assert.equal(strategyKey((name) => ({ OPENAI_API_KEY: ' ', OPEN_API_KEY: 'legacy' })[name]), 'legacy');
  assert.equal(strategyKey(() => undefined), undefined);
});
