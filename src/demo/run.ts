import { bus } from '../core/bus.js';
import { GeneMap } from '../core/gene-map.js';
import { PcecEngine } from '../core/pcec.js';
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
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgYellow: '\x1b[43m',
};

// ── Terminal Event Renderer ─────────────────────────────────────────

function renderEvent(event: SseEvent): void {
  const ts = new Date(event.timestamp).toISOString().slice(11, 23);
  const prefix = `${C.dim}${ts}${C.reset}`;
  const d = event.data;

  switch (event.type) {
    case 'perceive':
      console.log(
        `${prefix} ${C.bgRed}${C.white} PERCEIVE ${C.reset} ` +
          `${C.red}${d.code}${C.reset} → ${C.yellow}${d.category}${C.reset} ` +
          `[${d.severity}] ${C.dim}${d.details}${C.reset}`,
      );
      break;

    case 'construct': {
      const cands = d.candidates as { strategy: string; description: string }[];
      console.log(
        `${prefix} ${C.bgBlue}${C.white} CONSTRUCT ${C.reset} ` +
          `${C.blue}${d.candidateCount} candidates for ${d.category}${C.reset}`,
      );
      for (const c of cands) {
        console.log(`${prefix}   ${C.blue}├─${C.reset} ${c.strategy}: ${C.dim}${c.description}${C.reset}`);
      }
      break;
    }

    case 'evaluate': {
      const scores = d.allScores as { strategy: string; score: number }[];
      console.log(
        `${prefix} ${C.bgMagenta}${C.white} EVALUATE ${C.reset} ` +
          `${C.magenta}Winner: ${d.winner} (score: ${d.score})${C.reset}`,
      );
      for (const s of scores) {
        const bar = '█'.repeat(Math.round((s.score as number) / 5));
        const isWinner = s.strategy === d.winner;
        const color = isWinner ? C.green : C.dim;
        console.log(
          `${prefix}   ${C.magenta}├─${C.reset} ${color}${s.strategy}: ${bar} ${s.score}${C.reset}`,
        );
      }
      break;
    }

    case 'commit':
      if (d.success) {
        console.log(
          `${prefix} ${C.bgGreen}${C.white} COMMIT ${C.reset} ` +
            `${C.green}✓ ${d.strategy}${C.reset} ${C.dim}(${d.totalMs}ms)${C.reset}`,
        );
      } else {
        console.log(
          `${prefix} ${C.bgRed}${C.white} COMMIT ${C.reset} ` +
            `${C.red}✗ ${d.strategy} failed${C.reset}`,
        );
      }
      break;

    case 'gene':
      console.log(
        `${prefix} ${C.bgMagenta}${C.white} GENE ${C.reset} ` +
          `${C.magenta}📦 Capsule stored: ${d.category}/${d.code} → ${d.strategy}${C.reset} ` +
          `${C.dim}(${d.totalMs}ms)${C.reset}`,
      );
      break;

    case 'immune':
      console.log(
        `${prefix} ${C.bgCyan}${C.white} IMMUNE ${C.reset} ` +
          `${C.cyan}⚡ Instant fix: ${d.strategy}${C.reset} ` +
          `${C.dim}(${d.successCount} prior fixes, avg ${Math.round(d.avgRepairMs as number)}ms)${C.reset}`,
      );
      break;

    case 'stats':
      console.log(
        `${prefix} ${C.bgYellow}${C.white} STATS ${C.reset} ` +
          `${C.yellow}Repairs: ${d.totalRepairs} | Revenue saved: $${d.savedRevenue} | ` +
          `Immune: ${d.immuneHits} | Genes: ${d.geneCount}${C.reset}`,
      );
      break;
  }
}

// ── Simulated Failure Errors ────────────────────────────────────────

function makeError(code: string, message: string): Error {
  const err = new Error(message);
  (err as unknown as Record<string, unknown>).code = code;
  return err;
}

const SCENARIOS = [
  {
    name: '1. Insufficient Balance',
    error: makeError('payment-insufficient', 'Payment of 500 USDC failed: insufficient balance (have 12.50 USDC)'),
  },
  {
    name: '2. Session Expired',
    error: makeError('invalid-challenge', 'MPP session sess_7x2k expired at 2026-03-18T10:00:00Z'),
  },
  {
    name: '3. Currency Mismatch',
    error: makeError('method-unsupported', 'Service requires EURC payment, agent holds USDC'),
  },
  {
    name: '4. Signature Failure',
    error: makeError('verification-failed', 'Transaction signature invalid: nonce mismatch (expected 42, got 41)'),
  },
  {
    name: '5. Batch Revert',
    error: makeError('tx-reverted', 'Batch tx reverted: item 3/5 failed (recipient 0xdead not found)'),
  },
  {
    name: '6. Service Down After Payment',
    error: makeError('payment-required', 'HTTP 500 from api.service.com after payment — receipt txn_abc123 is valid'),
  },
  {
    name: '7. DEX Slippage',
    error: makeError('swap-reverted', 'Swap reverted: slippage exceeded 1% (actual 3.2%) on USDC→EURC pool'),
  },
  {
    name: '8. Compliance Block',
    error: makeError('tip-403', 'TIP-403: USDT transfer blocked by compliance policy for jurisdiction EU-RESTRICTED'),
  },
  {
    name: '9. Cascade Failure',
    error: makeError('cascade-failure', 'Agent chain A→B→C: agent C payment failed, waterfall refund needed'),
  },
  {
    name: '10. Off-Ramp Failure',
    error: makeError('offramp-failed', 'Bank transfer to IBAN DE89... failed: provider Moonpay returned error 503'),
  },
];

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║${C.reset}  ${C.bold}HELIX-TEMPO${C.reset} Self-Healing Payment Infrastructure Demo      ${C.bold}${C.cyan}║${C.reset}`);
  console.log(`${C.bold}${C.cyan}║${C.reset}  ${C.dim}PCEC Engine × Gene Map × Tempo Blockchain${C.reset}                  ${C.bold}${C.cyan}║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════════╝${C.reset}\n`);

  const geneMap = new GeneMap(':memory:');
  const engine = new PcecEngine(geneMap, 'demo-agent');

  // Subscribe to events for terminal output
  const unsub = bus.subscribe(renderEvent);

  // ── Phase 1: Run all 10 scenarios ──
  console.log(`${C.bold}${C.yellow}━━━ Phase 1: First Encounter (10 Failure Scenarios) ━━━${C.reset}\n`);

  for (const scenario of SCENARIOS) {
    console.log(`\n${C.bold}${C.white}▸ ${scenario.name}${C.reset}`);
    console.log(`${C.dim}  Error: ${scenario.error.message}${C.reset}\n`);
    await engine.repair(scenario.error);
    await sleep(300);
  }

  // ── Phase 2: Re-run first 3 to show immunity ──
  console.log(`\n\n${C.bold}${C.cyan}━━━ Phase 2: Gene Immunity (Re-running scenarios 1-3) ━━━${C.reset}`);
  console.log(`${C.dim}  Gene Map now has ${geneMap.immuneCount()} capsules — these should be INSTANT fixes${C.reset}\n`);

  for (const scenario of SCENARIOS.slice(0, 3)) {
    console.log(`\n${C.bold}${C.white}▸ ${scenario.name} ${C.cyan}[IMMUNITY TEST]${C.reset}`);
    await engine.repair(scenario.error);
    await sleep(200);
  }

  // ── Summary ──
  const stats = engine.getStats();
  console.log(`\n\n${C.bold}${C.green}╔══════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.green}║${C.reset}  ${C.bold}DEMO COMPLETE — Summary${C.reset}                                    ${C.bold}${C.green}║${C.reset}`);
  console.log(`${C.bold}${C.green}╠══════════════════════════════════════════════════════════════╣${C.reset}`);
  console.log(`${C.bold}${C.green}║${C.reset}  Total Repairs:    ${C.bold}${stats.repairs}${C.reset}${' '.repeat(40 - String(stats.repairs).length)}${C.bold}${C.green}║${C.reset}`);
  console.log(`${C.bold}${C.green}║${C.reset}  Immune Hits:      ${C.bold}${C.cyan}${stats.immuneHits}${C.reset}${' '.repeat(40 - String(stats.immuneHits).length)}${C.bold}${C.green}║${C.reset}`);
  console.log(`${C.bold}${C.green}║${C.reset}  Revenue Saved:    ${C.bold}${C.yellow}$${stats.savedRevenue.toLocaleString()}${C.reset}${' '.repeat(40 - String('$' + stats.savedRevenue.toLocaleString()).length)}${C.bold}${C.green}║${C.reset}`);
  console.log(`${C.bold}${C.green}║${C.reset}  Gene Capsules:    ${C.bold}${C.magenta}${stats.geneCount}${C.reset}${' '.repeat(40 - String(stats.geneCount).length)}${C.bold}${C.green}║${C.reset}`);
  console.log(`${C.bold}${C.green}╚══════════════════════════════════════════════════════════════╝${C.reset}\n`);

  console.log(`${C.dim}Gene Map contents:${C.reset}`);
  for (const gene of stats.genes) {
    console.log(
      `  ${C.magenta}●${C.reset} ${gene.category}/${gene.failureCode} → ${C.bold}${gene.strategy}${C.reset} ` +
        `(${gene.successCount} fixes, avg ${Math.round(gene.avgRepairMs)}ms)`,
    );
  }

  console.log(`\n${C.dim}Run ${C.white}npm run dash${C.dim} to see the Minecraft isometric lab dashboard${C.reset}\n`);

  unsub();
  geneMap.close();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch(console.error);
