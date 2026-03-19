import { writeFileSync, mkdirSync, existsSync } from 'fs';

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

// ── Types ───────────────────────────────────────────────────────────

export interface TaskResult {
  task_id: string;
  success: boolean;
  error?: string;
  errorType?: string;
  repaired?: boolean;
  repairStrategy?: string;
  timeMs: number;
  output?: string;
  passedValidation?: boolean;
  failReason?: string;
}

export interface BenchmarkResults {
  label: string;
  totalTasks: number;
  completed: number;
  failed: number;
  completionRate: number;
  passRate: number;
  avgTimeMs: number;
  results: TaskResult[];
  failures: Record<string, number>;
  modelQualityFails: number;
  repairs?: Record<string, number>;
  unrecoverable?: Record<string, number>;
  genesCaptured?: number;
  immuneHits?: number;
}

// ── Helpers ─────────────────────────────────────────────────────────

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

// ── Terminal Report ─────────────────────────────────────────────────

export function generateReport(baseline: BenchmarkResults, helix: BenchmarkResults): void {
  const w = 60;
  const line = '─'.repeat(w);
  const dblLine = '═'.repeat(w);

  const deltaDone = helix.completed - baseline.completed;
  const deltaRate = helix.completionRate - baseline.completionRate;
  const deltaPass = helix.passRate - baseline.passRate;
  const deltaTime = helix.avgTimeMs - baseline.avgTimeMs;

  const baseInfra = baseline.totalTasks - baseline.completed;
  const helixInfra = helix.totalTasks - helix.completed;
  const recovered = Object.values(helix.repairs ?? {}).reduce((a, b) => a + b, 0);
  const unrecovCount = Object.values(helix.unrecoverable ?? {}).reduce((a, b) => a + b, 0);

  const basePassed = Math.round(baseline.passRate * baseline.totalTasks / 100);
  const helixPassed = Math.round(helix.passRate * helix.totalTasks / 100);

  console.log(`\n  ${C.bold}${C.cyan}${dblLine}${C.reset}`);
  console.log(`\n  ${C.bold}🧬 HELIX BENCHMARK — HumanEval · ${process.env.OPENAI_API_KEY ? 'GPT-4o-mini' : 'Mock'} · ${baseline.totalTasks} tasks${C.reset}`);

  // ── Main table ──
  console.log(`\n  ${C.dim}${line}${C.reset}`);
  console.log(`${C.bold}  ${pad('', 26)}${pad('Baseline', 12)}${pad('With Helix', 12)}${pad('Delta', 10)}${C.reset}`);
  console.log(`  ${C.dim}${line}${C.reset}`);

  console.log(
    `  ${pad('API completed', 26)}` +
    `${C.red}${pad(`${baseline.completed}/${baseline.totalTasks}`, 12)}${C.reset}` +
    `${C.green}${pad(`${helix.completed}/${helix.totalTasks}`, 12)}${C.reset}` +
    `${C.cyan}${pad(`+${deltaDone}`, 10)}${C.reset}`
  );
  console.log(
    `  ${pad('Infrastructure fails', 26)}` +
    `${C.red}${pad(String(baseInfra), 12)}${C.reset}` +
    `${pad(String(helixInfra), 12)}` +
    `${C.green}${pad(`-${baseInfra - helixInfra}`, 10)}${C.reset}`
  );
  if (recovered > 0) {
    console.log(
      `  ${pad('  → recovered', 26)}` +
      `${C.dim}${pad('—', 12)}${C.reset}` +
      `${C.green}${pad(`${recovered} ✓`, 12)}${C.reset}` +
      `${pad('', 10)}`
    );
  }
  if (unrecovCount > 0) {
    console.log(
      `  ${pad('  → unrecoverable', 26)}` +
      `${C.dim}${pad('—', 12)}${C.reset}` +
      `${C.red}${pad(`${unrecovCount} ✗`, 12)}${C.reset}` +
      `${C.dim}${pad('(honest)', 10)}${C.reset}`
    );
  }
  console.log(
    `  ${pad('Pass@1 (valid code)', 26)}` +
    `${C.red}${pad(`${basePassed}/${baseline.totalTasks}`, 12)}${C.reset}` +
    `${C.green}${pad(`${helixPassed}/${helix.totalTasks}`, 12)}${C.reset}` +
    `${C.cyan}${pad(`+${helixPassed - basePassed}`, 10)}${C.reset}`
  );
  console.log(
    `  ${pad('Pass@1 rate', 26)}` +
    `${C.red}${pad(`${baseline.passRate.toFixed(1)}%`, 12)}${C.reset}` +
    `${C.green}${pad(`${helix.passRate.toFixed(1)}%`, 12)}${C.reset}` +
    `${C.cyan}${C.bold}${pad(`+${deltaPass.toFixed(1)}%`, 10)}${C.reset}`
  );
  console.log(
    `  ${pad('Model quality fails', 26)}` +
    `${C.yellow}${pad(String(baseline.modelQualityFails), 12)}${C.reset}` +
    `${C.yellow}${pad(String(helix.modelQualityFails), 12)}${C.reset}` +
    `${C.dim}${pad('— (not Helix\'s job)', 10)}${C.reset}`
  );
  console.log(
    `  ${pad('Avg time per task', 26)}` +
    `${pad(`${(baseline.avgTimeMs / 1000).toFixed(1)}s`, 12)}` +
    `${pad(`${(helix.avgTimeMs / 1000).toFixed(1)}s`, 12)}` +
    `${C.dim}${pad(`+${(deltaTime / 1000).toFixed(1)}s`, 10)}${C.reset}`
  );

  // ── Recovery detail ──
  console.log(`\n  ${C.bold}${C.dim}${'─'.repeat(18)} Recovery Detail ${'─'.repeat(22)}${C.reset}\n`);

  const failTypes = ['rate_limit', 'timeout', 'context_overflow', 'json_parse', 'server_error'];
  const labels: Record<string, string> = {
    rate_limit: 'rate_limit (429)',
    timeout: 'timeout',
    context_overflow: 'context_overflow',
    json_parse: 'json_parse',
    server_error: 'server_error (500)',
  };

  for (const ft of failTypes) {
    const baseCount = baseline.failures[ft] ?? 0;
    const repairedCount = helix.repairs?.[ft] ?? 0;
    const unrecovFt = helix.unrecoverable?.[ft] ?? 0;
    const helixFailedFt = helix.failures[ft] ?? 0;

    if (baseCount === 0 && repairedCount === 0 && unrecovFt === 0) continue;

    if (repairedCount > 0) {
      const immuneNote = ft === 'rate_limit' || ft === 'timeout' ? ` ${C.dim}(some immune)${C.reset}` : '';
      console.log(`  ${C.green}✓${C.reset} ${pad(labels[ft] ?? ft, 22)} × ${baseCount}  → ${C.green}${repairedCount} recovered${C.reset}${immuneNote}`);
    }
    if (unrecovFt > 0) {
      const reason = ft === 'context_overflow' ? 'task needs >128K tokens' : 'persistent outage (3/3 retries failed)';
      console.log(`  ${C.red}✗${C.reset} ${pad(labels[ft] ?? ft, 22)} × ${unrecovFt}  → ${C.red}FAILED${C.reset} ${C.dim}(${reason})${C.reset}`);
    }
    if (helixFailedFt > 0 && unrecovFt === 0) {
      console.log(`  ${C.red}✗${C.reset} ${pad(labels[ft] ?? ft, 22)} × ${helixFailedFt}  → ${C.red}unrecovered${C.reset}`);
    }
  }

  // ── Gene Map ──
  if (helix.genesCaptured || helix.immuneHits) {
    console.log(`\n  ${C.bold}${C.dim}${'─'.repeat(18)} Gene Map ${'─'.repeat(30)}${C.reset}\n`);
    console.log(`  Capsules: ${C.magenta}${helix.genesCaptured ?? 0}${C.reset} · Immune patterns: ${C.magenta}${helix.genesCaptured ?? 0}${C.reset} · Immune hits: ${C.cyan}${helix.immuneHits ?? 0}${C.reset}`);
  }

  console.log(`\n  ${C.bold}${C.cyan}${dblLine}${C.reset}`);

  // ── Pitch ──
  console.log(`\n  ${C.dim}"GPT-4o-mini: ${baseline.passRate.toFixed(0)}% → ${helix.passRate.toFixed(0)}% on HumanEval.${C.reset}`);
  console.log(`  ${C.dim} ${recovered} of ${baseInfra} failures recovered. ${unrecovCount} beyond repair.${C.reset}`);
  console.log(`  ${C.bold} We don't fake perfection. We deliver reliable infrastructure.${C.reset}\n`);

  // ── Save JSON ──
  const outDir = new URL('./results/', import.meta.url).pathname;
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const report = {
    timestamp: new Date().toISOString(),
    model: process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : 'mock',
    tasks: baseline.totalTasks,
    seed: 42,
    failureRates: { rateLimit429: 0.08, timeout: 0.05, contextOverflow: 0.03, jsonParse: 0.02, serverError: 0.02 },
    baseline: {
      completed: baseline.completed,
      failed: baseline.failed,
      completionRate: baseline.completionRate,
      passRate: baseline.passRate,
      avgTimeMs: baseline.avgTimeMs,
      failures: baseline.failures,
      modelQualityFails: baseline.modelQualityFails,
    },
    helix: {
      completed: helix.completed,
      failed: helix.failed,
      completionRate: helix.completionRate,
      passRate: helix.passRate,
      avgTimeMs: helix.avgTimeMs,
      failures: helix.failures,
      repairs: helix.repairs,
      unrecoverable: helix.unrecoverable,
      modelQualityFails: helix.modelQualityFails,
      genesCaptured: helix.genesCaptured,
      immuneHits: helix.immuneHits,
    },
    delta: {
      completionRate: `+${deltaRate.toFixed(1)}%`,
      passRate: `+${deltaPass.toFixed(1)}%`,
      tasksRecovered: recovered,
      unrecoverable: unrecovCount,
    },
  };

  const jsonPath = outDir + 'report.json';
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`  ${C.dim}Report saved to src/benchmark/results/report.json${C.reset}\n`);
}
