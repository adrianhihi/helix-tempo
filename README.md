# helix-tempo

Self-healing payment infrastructure SDK for AI agents on the Tempo blockchain.

**Tempo × Stripe HIIT Hackathon — March 19, 2026**

## What it does

Helix wraps any AI agent's MPP (Machine Payments Protocol) calls with a **PCEC self-repair engine**. When payments fail, Helix auto-repairs and retries. Every fix is stored in a **Gene Map** (SQLite), making the agent immune to recurring failures.

### Two-line integration

```ts
import { wrap } from '@helix/tempo';
const safePay = wrap(myAgent.pay);
```

That's it. `safePay` has the identical signature to `myAgent.pay`, but now self-heals on failure.

## PCEC Engine

**P**erceive → **C**onstruct → **E**valuate → **C**ommit

1. **Perceive** — Parse MPP 402 error, classify into one of 13 failure categories
2. **Construct** — Generate 2-3 repair candidates with cost/speed estimates
3. **Evaluate** — Score candidates (0-100), pick optimal strategy
4. **Commit** — Execute the repair, retry the original payment, store a Gene Capsule

Gene Capsules accumulate. When the same failure recurs → skip C+E → apply known fix instantly (**immune**).

## 13 Failure Scenarios

| # | Failure | Repair Strategy |
|---|---------|----------------|
| 1 | Insufficient Balance | Swap alt stablecoin via Tempo DEX |
| 2 | Session Expired | Auto-renew MPP session |
| 3 | Currency Mismatch | Swap to required asset |
| 4 | Signature Failure | Refresh nonce from Tempo RPC |
| 5 | Batch Revert | Remove failed item, resubmit |
| 6 | Service Down (paid) | Retry with MPP receipt |
| 7 | DEX Slippage | Split into smaller swaps |
| 8 | Compliance Block | Switch to unrestricted stablecoin |
| 9 | Cascade Failure | Refund waterfall C→B→A |
| 10 | Off-Ramp Failure | Switch off-ramp provider |
| 11 | Token Pause | Switch to unpaused stablecoin |
| 12 | Fee Sponsor Empty | Fallback to self-pay gas |
| 13 | Network Mismatch (REAL) | Switch network / bridge tokens |

## Quick Start

```bash
npm install
npm run demo        # Run all 13 scenarios in terminal
npm run dash        # Open the Minecraft isometric lab dashboard
npm run helix init  # Configure your project
```

## Dashboard

A Minecraft-style isometric lab where you can watch AI agent workers walk to the PCEC repair pod and Gene Library in real-time. Inject failures with buttons, watch immunity build up.

```bash
npm run dash
# → http://localhost:3710
```

## Architecture

```
src/
├── core/
│   ├── types.ts      # All TypeScript types
│   ├── bus.ts        # SSE EventBus
│   ├── gene-map.ts   # SQLite Gene Map
│   ├── pcec.ts       # PCEC engine (13 failure handlers)
│   └── index.ts      # wrap() entry point
├── cli/              # helix init/status/dash
├── dashboard/        # Isometric canvas lab
└── demo/             # Terminal demo runner
```

## Tech Stack

- TypeScript (ESM) + Node.js
- SQLite via better-sqlite3
- Express (dashboard server)
- Canvas-based isometric dashboard (zero dependencies)
