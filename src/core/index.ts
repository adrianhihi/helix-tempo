import { bus } from './bus.js';
import { GeneMap } from './gene-map.js';
import { PcecEngine } from './pcec.js';
import type { HelixConfig, RepairResult, WrapOptions } from './types.js';
import { DEFAULT_CONFIG } from './types.js';

export { bus } from './bus.js';
export { GeneMap } from './gene-map.js';
export { PcecEngine, perceive, construct, evaluate, commit } from './pcec.js';
export * from './types.js';

let _defaultEngine: PcecEngine | null = null;
let _defaultGeneMap: GeneMap | null = null;

export function createEngine(config?: Partial<HelixConfig>): { engine: PcecEngine; geneMap: GeneMap } {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const geneMap = new GeneMap(cfg.geneMapPath);
  const engine = new PcecEngine(geneMap, cfg.projectName);
  return { engine, geneMap };
}

function getDefaultEngine(config?: Partial<HelixConfig>): PcecEngine {
  if (!_defaultEngine) {
    const { engine, geneMap } = createEngine(config);
    _defaultEngine = engine;
    _defaultGeneMap = geneMap;
  }
  return _defaultEngine;
}

export function wrap<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options?: WrapOptions,
): (...args: TArgs) => Promise<TResult> {
  const maxRetries = options?.maxRetries ?? DEFAULT_CONFIG.maxRetries;
  const verbose = options?.verbose ?? DEFAULT_CONFIG.verbose;
  const agentId = options?.agentId ?? 'wrapped';

  return async (...args: TArgs): Promise<TResult> => {
    let lastResult: RepairResult | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        if (attempt === maxRetries) {
          if (verbose) {
            console.error(`\x1b[31m[helix] All ${maxRetries} repair attempts exhausted\x1b[0m`);
          }
          throw error;
        }

        const engine = getDefaultEngine(options?.config);

        if (verbose) {
          console.log(
            `\x1b[33m[helix] Payment failed (attempt ${attempt + 1}/${maxRetries}), engaging PCEC...\x1b[0m`,
          );
        }

        bus.emit('retry', agentId, { attempt: attempt + 1, maxRetries });

        lastResult = await engine.repair(error, {
          agentId,
          walletAddress: options?.config?.walletAddress ?? DEFAULT_CONFIG.walletAddress,
          availableBalances: { USDC: 5000, USDT: 3000, DAI: 2000 },
        });

        if (!lastResult.success) {
          if (verbose) {
            console.error(`\x1b[31m[helix] PCEC repair failed, retrying...\x1b[0m`);
          }
        } else if (verbose) {
          const tag = lastResult.immune ? '\x1b[36m⚡ IMMUNE' : '\x1b[32m✓ REPAIRED';
          console.log(
            `${tag}\x1b[0m via ${lastResult.winner?.strategy} in ${lastResult.totalMs}ms ` +
              `($${lastResult.revenueProtected} protected)`,
          );
        }
        // Loop continues — retry the original fn
      }
    }

    // Should not reach here, but TypeScript needs it
    throw new Error('Helix: unexpected repair loop exit');
  };
}

export function shutdown(): void {
  _defaultGeneMap?.close();
  _defaultGeneMap = null;
  _defaultEngine = null;
}
