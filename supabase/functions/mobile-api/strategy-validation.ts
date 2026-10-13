export type StrategyResponse = {
  diagnosis: string;
  impact: string;
  strategic_move: string;
  elevation: string;
  action_steps: string[];
};

export function parseStrategyResponse(value: string): StrategyResponse {
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Malformed strategy response.');
  for (const key of ['diagnosis', 'impact', 'strategic_move', 'elevation']) {
    if (typeof parsed[key] !== 'string' || !parsed[key].trim()) throw new Error('Malformed strategy response.');
  }
  if (!Array.isArray(parsed.action_steps) || parsed.action_steps.length < 3 || parsed.action_steps.length > 5 ||
      parsed.action_steps.some((step: unknown) => typeof step !== 'string' || !step.trim())) {
    throw new Error('Malformed strategy response.');
  }
  return {
    diagnosis: parsed.diagnosis, impact: parsed.impact, strategic_move: parsed.strategic_move,
    elevation: parsed.elevation, action_steps: parsed.action_steps,
  };
}

export function strategyKey(read: (name: string) => string | undefined): string | undefined {
  return ['OPENAI_API_KEY', 'OPEN_API_KEY', 'AI_STRATEGY_KEY']
    .map((name) => read(name)?.trim()).find((value) => !!value);
}
