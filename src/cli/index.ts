import { createReadStream, existsSync, readFileSync, writeFileSync } from 'fs';
import * as readline from 'readline';
import { bus } from '../core/bus.js';
import { GeneMap } from '../core/gene-map.js';
import type { HelixConfig, SseEvent } from '../core/types.js';
import { DEFAULT_CONFIG } from '../core/types.js';

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

const command = process.argv[2];

// ── helix init ──────────────────────────────────────────────────────

async function initWizard() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string, def: string): Promise<string> =>
    new Promise((resolve) => {
      rl.question(`${C.cyan}?${C.reset} ${q} ${C.dim}(${def})${C.reset}: `, (answer) => {
        resolve(answer.trim() || def);
      });
    });

  console.log(`\n${C.bold}${C.cyan}  HELIX-TEMPO${C.reset} Configuration Wizard\n`);

  const projectName = await ask('Project name', 'my-agent');
  const walletAddress = await ask('Wallet address', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18');
  const stablecoins = await ask('Stablecoins (comma-separated)', 'USDC,USDT,DAI');
  const monthlyBudget = await ask('Monthly budget (USD)', '10000');
  const maxRetries = await ask('Max retries', '3');
  const timeoutMs = await ask('Timeout (ms)', '30000');
  const dashboardPort = await ask('Dashboard port', '3710');

  const config: HelixConfig = {
    projectName,
    walletAddress,
    stablecoins: stablecoins.split(',').map((s) => s.trim()),
    monthlyBudget: Number(monthlyBudget),
    maxRetries: Number(maxRetries),
    timeoutMs: Number(timeoutMs),
    dashboardPort: Number(dashboardPort),
    verbose: true,
    geneMapPath: './helix-genes.db',
  };

  writeFileSync('helix.config.json', JSON.stringify(config, null, 2));
  rl.close();

  console.log(`\n${C.green}✓${C.reset} Config written to ${C.bold}helix.config.json${C.reset}\n`);
  console.log(`${C.dim}Next steps:${C.reset}`);
  console.log(`  1. ${C.white}import { wrap } from '@helix/tempo'${C.reset}`);
  console.log(`  2. ${C.white}const safePay = wrap(myAgent.pay)${C.reset}`);
  console.log(`  3. ${C.white}npm run demo${C.reset}   — see all 10 failure scenarios`);
  console.log(`  4. ${C.white}npm run dash${C.reset}   — open the Minecraft isometric lab\n`);
}

// ── helix status ────────────────────────────────────────────────────

function status() {
  console.log(`\n${C.bold}${C.cyan}  HELIX-TEMPO${C.reset} Live Status\n`);
  console.log(`${C.dim}  Listening for PCEC events... (Ctrl+C to exit)${C.reset}\n`);

  bus.subscribe((event: SseEvent) => {
    const ts = new Date(event.timestamp).toISOString().slice(11, 23);
    const prefix = `${C.dim}${ts}${C.reset}`;
    const d = event.data;

    switch (event.type) {
      case 'perceive':
        console.log(`${prefix} ${C.red}[PERCEIVE]${C.reset} ${d.code} → ${d.category} [${d.severity}]`);
        break;
      case 'construct':
        console.log(`${prefix} ${C.blue}[CONSTRUCT]${C.reset} ${d.candidateCount} candidates for ${d.category}`);
        break;
      case 'evaluate':
        console.log(`${prefix} ${C.magenta}[EVALUATE]${C.reset} Winner: ${d.winner} (score: ${d.score})`);
        break;
      case 'commit':
        if (d.success) {
          console.log(`${prefix} ${C.green}[COMMIT ✓]${C.reset} ${d.strategy} (${d.totalMs}ms)`);
        } else {
          console.log(`${prefix} ${C.red}[COMMIT ✗]${C.reset} ${d.strategy}`);
        }
        break;
      case 'gene':
        console.log(`${prefix} ${C.magenta}[GENE 📦]${C.reset} ${d.category}/${d.code} → ${d.strategy}`);
        break;
      case 'immune':
        console.log(`${prefix} ${C.cyan}[IMMUNE ⚡]${C.reset} ${d.strategy} (${d.successCount} prior fixes)`);
        break;
      case 'stats':
        console.log(
          `${prefix} ${C.yellow}[STATS]${C.reset} Repairs: ${d.totalRepairs} | Saved: $${d.savedRevenue} | Immune: ${d.immuneHits}`,
        );
        break;
    }
  });

  // Load Gene Map status
  const configPath = 'helix.config.json';
  const dbPath = existsSync(configPath)
    ? (JSON.parse(readFileSync(configPath, 'utf-8')) as HelixConfig).geneMapPath
    : DEFAULT_CONFIG.geneMapPath;

  if (existsSync(dbPath)) {
    const geneMap = new GeneMap(dbPath);
    const genes = geneMap.list();
    console.log(`${C.magenta}  Gene Map: ${genes.length} capsule(s)${C.reset}`);
    for (const gene of genes) {
      console.log(
        `    ${C.magenta}●${C.reset} ${gene.category}/${gene.failureCode} → ${gene.strategy} (${gene.successCount} fixes)`,
      );
    }
    geneMap.close();
  } else {
    console.log(`${C.dim}  No Gene Map found at ${dbPath}${C.reset}`);
  }

  console.log('');
}

// ── helix dash ──────────────────────────────────────────────────────

async function dash() {
  const { default: express } = await import('express');
  const { fileURLToPath } = await import('url');
  const { dirname, join } = await import('path');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const configPath = 'helix.config.json';
  const config: HelixConfig = existsSync(configPath)
    ? (JSON.parse(readFileSync(configPath, 'utf-8')) as HelixConfig)
    : DEFAULT_CONFIG;

  const app = express();
  const port = config.dashboardPort;

  // Serve dashboard HTML
  const dashboardPath = join(__dirname, '..', 'dashboard', 'index.html');
  const docsPath = join(__dirname, '..', 'dashboard', 'docs.html');
  const benchmarkPath = join(__dirname, '..', 'dashboard', 'benchmark.html');
  app.get('/', (_req, res) => {
    res.sendFile(dashboardPath);
  });

  // Serve docs page
  app.get('/docs', (_req, res) => {
    res.sendFile(docsPath);
  });

  // Serve benchmark showcase
  app.get('/benchmark', (_req, res) => {
    res.sendFile(benchmarkPath);
  });

  // Benchmark results API
  app.get('/api/helix/benchmark', (_req, res) => {
    const reportPath = join(__dirname, '..', 'benchmark', 'results', 'report.json');
    try {
      const data = readFileSync(reportPath, 'utf-8');
      res.json(JSON.parse(data));
    } catch {
      res.status(404).json({ error: 'Run npm run benchmark first' });
    }
  });

  // SSE endpoint
  app.get('/api/helix/stream', (_req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send history
    for (const event of bus.getHistory()) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    // Stream new events
    const unsub = bus.subscribe((event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    _req.on('close', unsub);
  });

  // Gene Map API
  app.get('/api/helix/genes', (_req, res) => {
    const dbPath = config.geneMapPath;
    if (!existsSync(dbPath)) {
      res.json({ genes: [], count: 0 });
      return;
    }
    const geneMap = new GeneMap(dbPath);
    const genes = geneMap.list();
    const count = geneMap.immuneCount();
    geneMap.close();
    res.json({ genes, count });
  });

  app.listen(port, () => {
    console.log(`\n${C.bold}${C.cyan}  HELIX-TEMPO${C.reset} Dashboard\n`);
    console.log(`  ${C.green}●${C.reset} Running at ${C.bold}http://localhost:${port}${C.reset}`);
    console.log(`  ${C.dim}SSE stream: http://localhost:${port}/api/helix/stream${C.reset}`);
    console.log(`  ${C.dim}Gene API:   http://localhost:${port}/api/helix/genes${C.reset}\n`);
    console.log(`  ${C.dim}Press Ctrl+C to stop${C.reset}\n`);
  });
}

// ── Router ──────────────────────────────────────────────────────────

switch (command) {
  case 'init':
    initWizard().catch(console.error);
    break;
  case 'status':
    status();
    break;
  case 'dash':
  case 'dashboard':
    dash().catch(console.error);
    break;
  default:
    console.log(`\n${C.bold}${C.cyan}  HELIX-TEMPO${C.reset} CLI\n`);
    console.log(`  ${C.white}helix init${C.reset}     — Configure your project`);
    console.log(`  ${C.white}helix status${C.reset}   — Show live PCEC events & Gene Map`);
    console.log(`  ${C.white}helix dash${C.reset}     — Start the Minecraft isometric dashboard\n`);
    break;
}
