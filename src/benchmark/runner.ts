import { bus } from '../core/bus.js';
import { GeneMap } from '../core/gene-map.js';
import { PcecEngine } from '../core/pcec.js';
import { TASKS, validateSolution, getFailReason } from './humaneval.js';
import { solveTask, isMockMode } from './agent.js';
import { buildFailureMap, withFailureInjection, isUnrecoverable, REALISTIC_FAILURE_RATES } from './injector.js';
import { generateReport } from './report.js';
import type { BenchmarkResults, TaskResult } from './report.js';
import type { HumanEvalTask } from './humaneval.js';
import type { SseEvent } from '../core/types.js';

// ── Colors ──────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// ── Config ──────────────────────────────────────────────────────────

const SEED = 42;
const TASK_LIMIT = Math.min(
  parseInt(process.env.HELIX_TASKS ?? '50', 10),
  TASKS.length,
);

const BANNER = `
${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════════╗${C.reset}
${C.bold}${C.cyan}║${C.reset}  ${C.bold}🧬 HELIX BENCHMARK${C.reset} — HumanEval × Failure Injection        ${C.bold}${C.cyan}║${C.reset}
${C.bold}${C.cyan}║${C.reset}  ${C.dim}Proving infrastructure > intelligence for completion rate${C.reset}  ${C.bold}${C.cyan}║${C.reset}
${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════════╝${C.reset}`;

function progressBar(current: number, total: number, width: number = 30): string {
  const pct = current / total;
  const filled = Math.round(pct * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled) + ` ${current}/${total} (${(pct * 100).toFixed(0)}%)`;
}

function classifyError(err: unknown): string {
  if (!(err instanceof Error)) return 'unknown';
  const msg = err.message.toLowerCase();
  if (msg.includes('429') || msg.includes('rate limit')) return 'rate_limit';
  if (msg.includes('timeout')) return 'timeout';
  if (msg.includes('context_length') || msg.includes('maximum context')) return 'context_overflow';
  if (msg.includes('json parse') || msg.includes('unexpected token')) return 'json_parse';
  if (msg.includes('500')) return 'server_error';
  return 'unknown';
}

// ── Run benchmark ───────────────────────────────────────────────────

interface RunConfig {
  tasks: HumanEvalTask[];
  agent: (task: HumanEvalTask, index: number) => Promise<string>;
  helix: boolean;
  label: string;
}

async function runBenchmark(config: RunConfig): Promise<BenchmarkResults> {
  const results: TaskResult[] = [];
  const failures: Record<string, number> = {};
  const repairs: Record<string, number> = {};
  const unrecoverable: Record<string, number> = {};
  let totalTime = 0;
  let completed = 0;
  let passed = 0;
  let modelQualityFails = 0;
  let genesCaptured = 0;
  let immuneHits = 0;

  let engine: PcecEngine | null = null;
  let geneMap: GeneMap | null = null;
  if (config.helix) {
    geneMap = new GeneMap(':memory:');
    engine = new PcecEngine(geneMap, 'benchmark');
  }

  for (let i = 0; i < config.tasks.length; i++) {
    const task = config.tasks[i];
    const start = Date.now();

    process.stdout.write(
      `\r  ${C.dim}${progressBar(i + 1, config.tasks.length)}${C.reset}  ${C.dim}${task.task_id}${C.reset}      `,
    );

    try {
      const output = await config.agent(task, i);
      const elapsed = Date.now() - start;
      totalTime += elapsed;
      completed++;

      const valid = validateSolution(task, output);
      const failReason = getFailReason(task, output);

      if (valid) {
        passed++;
      } else {
        modelQualityFails++;
        process.stdout.write(
          `\r  ${C.dim}${progressBar(i + 1, config.tasks.length)}${C.reset}  ${C.yellow}△ ${task.task_id}${C.reset} ${C.dim}model:${failReason}${C.reset}      \n`,
        );
      }

      results.push({
        task_id: task.task_id,
        success: true,
        timeMs: elapsed,
        output: output.slice(0, 200),
        passedValidation: valid,
        failReason: failReason ?? undefined,
      });
    } catch (err) {
      const errorType = classifyError(err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      let recovered = false;

      if (config.helix && engine) {
        // Check if this failure is unrecoverable
        const unrecoverableTask = isUnrecoverable(i);

        try {
          const repairResult = await engine.repair(err);
          if (repairResult.success && !unrecoverableTask) {
            // Retry the underlying solveTask (bypassing injector)
            try {
              const retryOutput = await solveTask(task);
              const elapsed = Date.now() - start;
              totalTime += elapsed;
              completed++;

              const valid = validateSolution(task, retryOutput);
              const failReason = getFailReason(task, retryOutput);
              if (valid) {
                passed++;
              } else {
                modelQualityFails++;
              }

              const strat = repairResult.winner?.strategy ?? 'unknown';
              repairs[errorType] = (repairs[errorType] ?? 0) + 1;
              if (repairResult.immune) immuneHits++;
              recovered = true;

              results.push({
                task_id: task.task_id,
                success: true,
                repaired: true,
                repairStrategy: strat,
                timeMs: elapsed,
                output: retryOutput.slice(0, 200),
                passedValidation: valid,
                failReason: failReason ?? undefined,
              });

              process.stdout.write(
                `\r  ${C.dim}${progressBar(i + 1, config.tasks.length)}${C.reset}  ` +
                `${repairResult.immune ? `${C.cyan}⚡ IMMUNE` : `${C.green}✓ REPAIRED`}${C.reset} ${task.task_id} via ${strat}      \n`,
              );
              continue;
            } catch {
              // Retry failed too
            }
          }

          // If unrecoverable, log it explicitly
          if (unrecoverableTask) {
            const strat = repairResult.winner?.strategy ?? 'unknown';
            unrecoverable[errorType] = (unrecoverable[errorType] ?? 0) + 1;

            process.stdout.write(
              `\r  ${C.dim}${progressBar(i + 1, config.tasks.length)}${C.reset}  ` +
              `${C.red}✗ UNRECOVERABLE${C.reset} ${task.task_id} ${C.dim}${errorType} — ${strat} failed${C.reset}      \n`,
            );
          }
        } catch {
          // Repair itself failed
        }
      }

      if (!recovered) {
        const elapsed = Date.now() - start;
        totalTime += elapsed;
        failures[errorType] = (failures[errorType] ?? 0) + 1;

        results.push({
          task_id: task.task_id,
          success: false,
          error: errorMsg.slice(0, 120),
          errorType,
          timeMs: elapsed,
        });

        if (!config.helix) {
          process.stdout.write(
            `\r  ${C.dim}${progressBar(i + 1, config.tasks.length)}${C.reset}  ${C.red}✗ ${task.task_id}${C.reset} ${C.dim}${errorType}${C.reset}      \n`,
          );
        }
      }
    }
  }

  process.stdout.write('\r' + ' '.repeat(80) + '\r');

  if (config.helix && geneMap) {
    genesCaptured = geneMap.immuneCount();
    geneMap.close();
  }

  const completionRate = (completed / config.tasks.length) * 100;
  const passRate = (passed / config.tasks.length) * 100;
  const avgTimeMs = config.tasks.length > 0 ? totalTime / config.tasks.length : 0;

  console.log(
    `  ${config.helix ? C.green : C.yellow}${config.label}:${C.reset} ` +
    `${completed}/${config.tasks.length} completed (${completionRate.toFixed(1)}%), ` +
    `${passed} passed (${passRate.toFixed(1)}%), ` +
    `${modelQualityFails} model-quality fails, ` +
    `avg ${(avgTimeMs / 1000).toFixed(1)}s/task`,
  );

  return {
    label: config.label,
    totalTasks: config.tasks.length,
    completed,
    failed: config.tasks.length - completed,
    completionRate,
    passRate,
    avgTimeMs,
    results,
    failures,
    modelQualityFails,
    repairs: config.helix ? repairs : undefined,
    unrecoverable: config.helix ? unrecoverable : undefined,
    genesCaptured: config.helix ? genesCaptured : undefined,
    immuneHits: config.helix ? immuneHits : undefined,
  };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log(BANNER);

  if (isMockMode) {
    console.log(`\n  ${C.yellow}[MOCK MODE — no OPENAI_API_KEY, using simulated responses]${C.reset}`);
  } else {
    console.log(`\n  ${C.green}●${C.reset} Using OpenAI API (gpt-4o-mini)`);
  }

  const tasks = TASKS.slice(0, TASK_LIMIT);
  console.log(`  ${C.dim}Tasks: ${tasks.length} | Seed: ${SEED} | Failure rate: ~20%${C.reset}`);

  const totalFailures = REALISTIC_FAILURE_RATES.rateLimit429Rate + REALISTIC_FAILURE_RATES.timeoutRate +
    REALISTIC_FAILURE_RATES.contextOverflowRate + REALISTIC_FAILURE_RATES.jsonParseErrorRate +
    REALISTIC_FAILURE_RATES.serverErrorRate;
  const expectedFails = Math.round(tasks.length * totalFailures);
  console.log(`  ${C.dim}Expected failures: ~${expectedFails} of ${tasks.length} tasks (+2 unrecoverable)${C.reset}`);

  if (!isMockMode) {
    const estCost = (tasks.length * 2 * 500 / 1_000_000 * 0.15).toFixed(2);
    console.log(`  ${C.dim}Estimated API cost: ~$${estCost}${C.reset}`);
  }

  const failureMap = buildFailureMap(tasks.length, SEED, REALISTIC_FAILURE_RATES);
  const failCount = failureMap.filter(f => f !== 'none').length;
  console.log(`  ${C.dim}Injected failures for this seed: ${failCount}/${tasks.length}${C.reset}`);

  // ── RUN 1: WITHOUT HELIX ──
  console.log(`\n${C.bold}${C.yellow}  ━━━ Phase 1: Running WITHOUT Helix (baseline) ━━━${C.reset}\n`);

  const baselineAgent = withFailureInjection(solveTask, failureMap);
  const baselineResults = await runBenchmark({
    tasks,
    agent: baselineAgent,
    helix: false,
    label: 'Baseline (no Helix)',
  });

  // ── RUN 2: WITH HELIX ──
  console.log(`\n${C.bold}${C.green}  ━━━ Phase 2: Running WITH Helix ━━━${C.reset}\n`);

  const unsub = bus.subscribe((_event: SseEvent) => {});

  const helixAgent = withFailureInjection(solveTask, failureMap);
  const helixResults = await runBenchmark({
    tasks,
    agent: helixAgent,
    helix: true,
    label: 'With Helix SDK',
  });

  unsub();

  // ── REPORT ──
  generateReport(baselineResults, helixResults);
}

main().catch((err) => {
  console.error(`\n${C.red}Fatal error:${C.reset}`, err);
  process.exit(1);
});
