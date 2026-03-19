import type { HumanEvalTask } from './humaneval.js';

// ── Seeded PRNG (LCG) ──────────────────────────────────────────────

export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── Failure injection config ────────────────────────────────────────

export interface InjectorConfig {
  rateLimit429Rate: number;
  timeoutRate: number;
  contextOverflowRate: number;
  jsonParseErrorRate: number;
  serverErrorRate: number;
}

export const REALISTIC_FAILURE_RATES: InjectorConfig = {
  rateLimit429Rate: 0.08,
  timeoutRate: 0.05,
  contextOverflowRate: 0.03,
  jsonParseErrorRate: 0.02,
  serverErrorRate: 0.02,
  // Total: ~20%
};

export type FailureType = 'rate_limit' | 'timeout' | 'context_overflow' | 'json_parse' | 'server_error' | 'none';

// ── Unrecoverable task indices ──────────────────────────────────────
// These tasks have PERSISTENT failures that survive PCEC repair.
// - Task 23: context overflow that genuinely needs >128K tokens
// - Task 41: persistent server outage (service truly down)

const UNRECOVERABLE_TASKS = new Set([23, 41]);

export function isUnrecoverable(taskIndex: number): boolean {
  return UNRECOVERABLE_TASKS.has(taskIndex);
}

// ── Determine which failure hits a given index ──────────────────────

export function getFailureForIndex(index: number, rng: () => number, config: InjectorConfig): FailureType {
  // Force unrecoverable tasks to have specific failure types
  if (index === 23) return 'context_overflow';
  if (index === 41) return 'server_error';

  const rand = rng();
  let cumulative = 0;

  cumulative += config.rateLimit429Rate;
  if (rand < cumulative) return 'rate_limit';

  cumulative += config.timeoutRate;
  if (rand < cumulative) return 'timeout';

  cumulative += config.contextOverflowRate;
  if (rand < cumulative) return 'context_overflow';

  cumulative += config.jsonParseErrorRate;
  if (rand < cumulative) return 'json_parse';

  cumulative += config.serverErrorRate;
  if (rand < cumulative) return 'server_error';

  return 'none';
}

// ── Pre-compute failure map for a given seed ────────────────────────

export function buildFailureMap(taskCount: number, seed: number, config: InjectorConfig): FailureType[] {
  const rng = seededRandom(seed);
  const map: FailureType[] = [];
  for (let i = 0; i < taskCount; i++) {
    map.push(getFailureForIndex(i, rng, config));
  }
  return map;
}

// ── Wrap a function with failure injection ──────────────────────────

export function withFailureInjection(
  fn: (task: HumanEvalTask) => Promise<string>,
  failureMap: FailureType[],
): (task: HumanEvalTask, index: number) => Promise<string> {
  return async (task: HumanEvalTask, index: number) => {
    const failure = failureMap[index] ?? 'none';

    switch (failure) {
      case 'rate_limit': {
        const err = new Error('429 Too Many Requests: Rate limit exceeded. Retry after 30s.');
        (err as unknown as Record<string, unknown>).code = 'rate_limit';
        throw err;
      }
      case 'timeout': {
        await new Promise(r => setTimeout(r, 200));
        const err = new Error('TIMEOUT: Request exceeded 10000ms timeout');
        (err as unknown as Record<string, unknown>).code = 'timeout';
        throw err;
      }
      case 'context_overflow': {
        const err = new Error('400 Bad Request: context_length_exceeded. Maximum context length is 128000 tokens.');
        (err as unknown as Record<string, unknown>).code = 'context_overflow';
        throw err;
      }
      case 'json_parse': {
        const err = new Error('JSON Parse Error: Unexpected token < in JSON at position 0');
        (err as unknown as Record<string, unknown>).code = 'json_parse';
        throw err;
      }
      case 'server_error': {
        const err = new Error('500 Internal Server Error: The server had an error processing your request.');
        (err as unknown as Record<string, unknown>).code = 'server_error';
        throw err;
      }
      default:
        return fn(task);
    }
  };
}
