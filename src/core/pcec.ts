import { bus } from './bus.js';
import { GeneMap } from './gene-map.js';
import type {
  FailureCategory,
  FailureClassification,
  GeneCapsule,
  MppErrorCode,
  RepairCandidate,
  RepairContext,
  RepairResult,
  Severity,
} from './types.js';

// ── Error Code → Category Mapping ───────────────────────────────────

const CODE_TO_CATEGORY: Record<string, FailureCategory> = {
  'payment-insufficient': 'balance',
  'invalid-challenge': 'session',
  'payment-expired': 'session',
  'method-unsupported': 'currency',
  'verification-failed': 'signature',
  'tx-reverted': 'batch',
  'swap-reverted': 'dex',
  'tip-403': 'compliance',
  'cascade-failure': 'cascade',
  'offramp-failed': 'offramp',
};

const CATEGORY_SEVERITY: Record<FailureCategory, Severity> = {
  balance: 'high',
  session: 'medium',
  currency: 'medium',
  signature: 'high',
  batch: 'high',
  service: 'critical',
  dex: 'medium',
  compliance: 'critical',
  cascade: 'critical',
  offramp: 'high',
};

// ── Revenue estimates per category ──────────────────────────────────

const REVENUE_AT_RISK: Record<FailureCategory, number> = {
  balance: 150,
  session: 50,
  currency: 200,
  signature: 100,
  batch: 500,
  service: 300,
  dex: 175,
  compliance: 250,
  cascade: 1000,
  offramp: 400,
};

// ── Perceive ────────────────────────────────────────────────────────

export function perceive(error: unknown, _context?: RepairContext): FailureClassification {
  let code: MppErrorCode = 'payment-required';
  let details = 'Unknown error';
  let category: FailureCategory = 'balance';

  if (error instanceof Error) {
    details = error.message;
    // Extract error code from message or properties
    const errAny = error as unknown as Record<string, unknown>;
    const errorCode = (errAny.code ?? errAny.errorCode ?? '') as string;

    if (errorCode && CODE_TO_CATEGORY[errorCode]) {
      code = errorCode as MppErrorCode;
      category = CODE_TO_CATEGORY[errorCode];
    } else {
      // Try to infer from message
      const msg = error.message.toLowerCase();
      if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests')) {
        code = 'payment-required';
        category = 'service';
      } else if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('exceeded') && msg.includes('ms')) {
        code = 'payment-expired';
        category = 'session';
      } else if (msg.includes('context_length') || msg.includes('context length') || msg.includes('too many tokens') || msg.includes('maximum context')) {
        code = 'method-unsupported';
        category = 'batch';
      } else if (msg.includes('json parse') || msg.includes('unexpected token') || msg.includes('syntaxerror')) {
        code = 'malformed-credential';
        category = 'signature';
      } else if (msg.includes('insufficient') || msg.includes('balance')) {
        code = 'payment-insufficient';
        category = 'balance';
      } else if (msg.includes('expired') || msg.includes('session')) {
        code = 'invalid-challenge';
        category = 'session';
      } else if (msg.includes('currency') || msg.includes('unsupported')) {
        code = 'method-unsupported';
        category = 'currency';
      } else if (msg.includes('signature') || msg.includes('nonce') || msg.includes('verification')) {
        code = 'verification-failed';
        category = 'signature';
      } else if (msg.includes('revert') && msg.includes('batch')) {
        code = 'tx-reverted';
        category = 'batch';
      } else if (msg.includes('500') || msg.includes('service') || msg.includes('receipt')) {
        code = 'payment-required';
        category = 'service';
      } else if (msg.includes('slippage') || msg.includes('swap')) {
        code = 'swap-reverted';
        category = 'dex';
      } else if (msg.includes('compliance') || msg.includes('policy') || msg.includes('blocked')) {
        code = 'tip-403';
        category = 'compliance';
      } else if (msg.includes('cascade') || msg.includes('chain')) {
        code = 'cascade-failure';
        category = 'cascade';
      } else if (msg.includes('off-ramp') || msg.includes('bank') || msg.includes('offramp')) {
        code = 'offramp-failed';
        category = 'offramp';
      }
    }
  } else if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    if (obj.code && CODE_TO_CATEGORY[obj.code as string]) {
      code = obj.code as MppErrorCode;
      category = CODE_TO_CATEGORY[obj.code as string];
    }
    details = (obj.message as string) ?? JSON.stringify(obj);
  }

  // Extract structured values from error message
  let actualBalance: number | undefined;
  let requiredAmount: number | undefined;

  if (error instanceof Error) {
    const msg = error.message;

    // Match "have 12.50 USDC" or "balance: 12.50"
    const balanceMatch = msg.match(/have\s+([\d.]+)\s+\w+|balance[:\s]+([\d.]+)/i);
    if (balanceMatch) {
      actualBalance = parseFloat(balanceMatch[1] ?? balanceMatch[2]);
    }

    // Match "Payment of 500 USDC" or "requires 500"
    const amountMatch = msg.match(/[Pp]ayment\s+of\s+([\d.]+)|requires\s+([\d.]+)/);
    if (amountMatch) {
      requiredAmount = parseFloat(amountMatch[1] ?? amountMatch[2]);
    }
  }

  return {
    code,
    category,
    severity: CATEGORY_SEVERITY[category],
    details,
    rawError: error,
    timestamp: Date.now(),
    actualBalance,
    requiredAmount,
  };
}

// ── Construct ───────────────────────────────────────────────────────

const REPAIR_STRATEGIES: Record<FailureCategory, RepairCandidate[]> = {
  balance: [
    {
      id: 'swap_currency',
      strategy: 'swap_currency',
      description: 'Swap alt stablecoin via Tempo DEX to cover balance',
      estimatedCostUsd: 0.50,
      estimatedSpeedMs: 800,
      requirements: ['alt_stablecoin_balance'],
      score: 0,
      successProbability: 0.5,
    },
    {
      id: 'topup_from_reserve',
      strategy: 'topup_from_reserve',
      description: 'Top up from reserve wallet',
      estimatedCostUsd: 0.10,
      estimatedSpeedMs: 1200,
      requirements: ['reserve_wallet', 'reserve_balance'],
      score: 0,
      successProbability: 0.5,
    },
    {
      id: 'reduce_request',
      strategy: 'reduce_request',
      description: 'Reduce payment amount to available balance',
      estimatedCostUsd: 0,
      estimatedSpeedMs: 100,
      requirements: ['partial_payment_support'],
      score: 0,
      successProbability: 0.5,
    },
  ],
  session: [
    {
      id: 'renew_session',
      strategy: 'renew_session',
      description: 'Auto-renew MPP session with fresh challenge',
      estimatedCostUsd: 0,
      estimatedSpeedMs: 300,
      requirements: [],
      score: 0,
      successProbability: 0.5,
    },
    {
      id: 'switch_to_charge',
      strategy: 'switch_to_charge',
      description: 'Switch from session to one-time charge',
      estimatedCostUsd: 0.05,
      estimatedSpeedMs: 500,
      requirements: ['charge_support'],
      score: 0,
      successProbability: 0.5,
    },
  ],
  currency: [
    {
      id: 'swap_direct',
      strategy: 'swap_direct',
      description: 'Direct swap to required currency via Tempo DEX',
      estimatedCostUsd: 0.30,
      estimatedSpeedMs: 600,
      requirements: ['dex_liquidity'],
      score: 0,
      successProbability: 0.5,
    },
    {
      id: 'swap_multihop',
      strategy: 'swap_multihop',
      description: 'Multi-hop swap via intermediate currency',
      estimatedCostUsd: 0.80,
      estimatedSpeedMs: 1500,
      requirements: ['dex_liquidity', 'intermediate_pair'],
      score: 0,
      successProbability: 0.5,
    },
    {
      id: 'switch_service',
      strategy: 'switch_service',
      description: 'Switch to service that accepts current currency',
      estimatedCostUsd: 0,
      estimatedSpeedMs: 200,
      requirements: ['alt_service'],
      score: 0,
      successProbability: 0.5,
    },
  ],
  signature: [
    {
      id: 'refresh_nonce',
      strategy: 'refresh_nonce',
      description: 'Refresh nonce from Tempo RPC and re-sign',
      estimatedCostUsd: 0,
      estimatedSpeedMs: 400,
      requirements: [],
      score: 0,
      successProbability: 0.5,
    },
    {
      id: 'rederive_key',
      strategy: 'rederive_key',
      description: 'Re-derive signing key from wallet',
      estimatedCostUsd: 0,
      estimatedSpeedMs: 600,
      requirements: ['wallet_access'],
      score: 0,
      successProbability: 0.5,
    },
  ],
  batch: [
    {
      id: 'remove_and_resubmit',
      strategy: 'remove_and_resubmit',
      description: 'Remove failed item from batch and resubmit',
      estimatedCostUsd: 0.10,
      estimatedSpeedMs: 500,
      requirements: [],
      score: 0,
      successProbability: 0.5,
    },
    {
      id: 'fix_and_retry_all',
      strategy: 'fix_and_retry_all',
      description: 'Fix failed item and retry entire batch',
      estimatedCostUsd: 0.20,
      estimatedSpeedMs: 1000,
      requirements: ['item_fixable'],
      score: 0,
      successProbability: 0.5,
    },
    {
      id: 'split_batch',
      strategy: 'split_batch',
      description: 'Split batch into individual transactions',
      estimatedCostUsd: 0.50,
      estimatedSpeedMs: 2000,
      requirements: [],
      score: 0,
      successProbability: 0.5,
    },
  ],
  service: [
    {
      id: 'retry_with_receipt',
      strategy: 'retry_with_receipt',
      description: 'Retry request with MPP payment receipt (idempotent)',
      estimatedCostUsd: 0,
      estimatedSpeedMs: 200,
      requirements: ['valid_receipt'],
      score: 0,
      successProbability: 0.5,
    },
    {
      id: 'switch_provider',
      strategy: 'switch_provider',
      description: 'Switch to backup service provider',
      estimatedCostUsd: 0.10,
      estimatedSpeedMs: 800,
      requirements: ['alt_provider'],
      score: 0,
      successProbability: 0.5,
    },
    {
      id: 'request_refund',
      strategy: 'request_refund',
      description: 'Request refund for failed service delivery',
      estimatedCostUsd: 0,
      estimatedSpeedMs: 3000,
      requirements: ['refund_support'],
      score: 0,
      successProbability: 0.5,
    },
  ],
  dex: [
    {
      id: 'split_swap',
      strategy: 'split_swap',
      description: 'Split into multiple smaller swaps to avoid slippage',
      estimatedCostUsd: 0.40,
      estimatedSpeedMs: 1200,
      requirements: [],
      score: 0,
      successProbability: 0.5,
    },
    {
      id: 'swap_multihop_dex',
      strategy: 'swap_multihop',
      description: 'Route through deeper liquidity pool',
      estimatedCostUsd: 0.60,
      estimatedSpeedMs: 1800,
      requirements: ['alt_pool'],
      score: 0,
      successProbability: 0.5,
    },
    {
      id: 'wait_and_retry',
      strategy: 'wait_and_retry',
      description: 'Wait for liquidity to stabilize and retry',
      estimatedCostUsd: 0,
      estimatedSpeedMs: 5000,
      requirements: [],
      score: 0,
      successProbability: 0.5,
    },
  ],
  compliance: [
    {
      id: 'switch_stablecoin',
      strategy: 'switch_stablecoin',
      description: 'Switch to unrestricted stablecoin (e.g., DAI)',
      estimatedCostUsd: 0.30,
      estimatedSpeedMs: 700,
      requirements: ['unrestricted_coin_balance'],
      score: 0,
      successProbability: 0.5,
    },
    {
      id: 'route_via_compliant_wallet',
      strategy: 'route_via_compliant_wallet',
      description: 'Route payment via KYC-compliant wallet',
      estimatedCostUsd: 1.00,
      estimatedSpeedMs: 2000,
      requirements: ['compliant_wallet'],
      score: 0,
      successProbability: 0.5,
    },
  ],
  cascade: [
    {
      id: 'refund_waterfall',
      strategy: 'refund_waterfall',
      description: 'Initiate refund waterfall C→B→A',
      estimatedCostUsd: 0.50,
      estimatedSpeedMs: 3000,
      requirements: [],
      score: 0,
      successProbability: 0.5,
    },
    {
      id: 'reroute_via_alt',
      strategy: 'reroute_via_alt',
      description: 'Reroute cascade through alternative agent',
      estimatedCostUsd: 2.00,
      estimatedSpeedMs: 5000,
      requirements: ['alt_agent'],
      score: 0,
      successProbability: 0.5,
    },
  ],
  offramp: [
    {
      id: 'switch_offramp',
      strategy: 'switch_offramp',
      description: 'Switch to backup off-ramp provider',
      estimatedCostUsd: 1.50,
      estimatedSpeedMs: 2000,
      requirements: ['alt_offramp'],
      score: 0,
      successProbability: 0.5,
    },
    {
      id: 'hold_and_notify',
      strategy: 'hold_and_notify',
      description: 'Hold funds on-chain and notify operator',
      estimatedCostUsd: 0,
      estimatedSpeedMs: 500,
      requirements: [],
      score: 0,
      successProbability: 0.5,
    },
  ],
};

export function construct(failure: FailureClassification, geneMap?: GeneMap): RepairCandidate[] {
  const templates = REPAIR_STRATEGIES[failure.category] ?? [];
  return templates.map((t) => ({
    ...t,
    score: 0,
    successProbability: geneMap
      ? geneMap.getSuccessRate(failure.code, t.strategy)
      : 0.5,
  }));
}

// ── Evaluate ────────────────────────────────────────────────────────

export function evaluate(candidates: RepairCandidate[], failure: FailureClassification): RepairCandidate[] {
  const maxSpeed = Math.max(...candidates.map((c) => c.estimatedSpeedMs), 1);
  const maxCost = Math.max(...candidates.map((c) => c.estimatedCostUsd), 0.01);

  const severityBonus: Record<Severity, number> = {
    low: 0,
    medium: 5,
    high: 10,
    critical: 20,
  };

  return candidates
    .map((c) => {
      const speedScore = 25 * (1 - c.estimatedSpeedMs / maxSpeed);
      const costScore = 25 * (1 - c.estimatedCostUsd / maxCost);
      const reqScore = 15 * (1 - c.requirements.length / 3);
      const probScore = 25 * (c.successProbability ?? 0.5);
      const sevBonus = severityBonus[failure.severity];
      const score = Math.min(100, Math.round(speedScore + costScore + reqScore + probScore + sevBonus));
      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score);
}

// ── Commit (simulated) ─────────────────────────────────────────────

export async function commit(
  winner: RepairCandidate,
  _failure: FailureClassification,
  _context?: RepairContext,
): Promise<{ success: boolean; result: string }> {
  // Simulate execution with realistic delay
  const jitter = Math.random() * 200;
  await new Promise((r) => setTimeout(r, Math.min(winner.estimatedSpeedMs * 0.3 + jitter, 800)));

  // In production: call Tempo SDK, execute DEX swap, renew session, etc.
  return {
    success: true,
    result: `Executed ${winner.strategy}: ${winner.description}`,
  };
}

// ── PCEC Engine ─────────────────────────────────────────────────────

export class PcecEngine {
  private geneMap: GeneMap;
  private agentId: string;
  public stats = { repairs: 0, savedRevenue: 0, immuneHits: 0 };
  private readonly MAX_CYCLES = 3;
  private readonly MAX_COST_RATIO = 0.1;
  private cycleCount = 0;
  private totalRepairCost = 0;

  constructor(geneMap: GeneMap, agentId: string = 'default') {
    this.geneMap = geneMap;
    this.agentId = agentId;
  }

  async repair(error: unknown, context?: RepairContext): Promise<RepairResult> {
    const start = Date.now();

    // Safety check: prevent infinite repair cycles
    this.cycleCount++;
    if (this.cycleCount > this.MAX_CYCLES) {
      this.cycleCount = 0;
      bus.emit('error', this.agentId, {
        reason: 'MAX_CYCLES_EXCEEDED',
        cycles: this.MAX_CYCLES,
        message: `PCEC halted after ${this.MAX_CYCLES} cycles to prevent runaway repair`,
      });
      return {
        success: false,
        failure: perceive(error),
        candidates: [],
        winner: null,
        gene: null,
        immune: false,
        totalMs: 0,
        revenueProtected: 0,
      };
    }

    // ── PERCEIVE ──
    const failure = perceive(error, context);
    bus.emit('perceive', this.agentId, {
      code: failure.code,
      category: failure.category,
      severity: failure.severity,
      details: failure.details,
      actualBalance: failure.actualBalance,
      requiredAmount: failure.requiredAmount,
    });

    // ── Check Gene Map for immunity ──
    const existingGene = this.geneMap.lookup(failure.code, failure.category);
    if (existingGene) {
      this.stats.immuneHits++;
      this.stats.repairs++;
      const revenue = REVENUE_AT_RISK[failure.category];
      this.stats.savedRevenue += revenue;

      bus.emit('immune', this.agentId, {
        code: failure.code,
        category: failure.category,
        strategy: existingGene.strategy,
        successCount: existingGene.successCount,
        avgRepairMs: existingGene.avgRepairMs,
      });

      // Execute known fix instantly
      const immuneStart = Date.now();
      await new Promise((r) => setTimeout(r, 50 + Math.random() * 50)); // near-instant
      const immuneMs = Date.now() - immuneStart;

      // Update gene with new timing
      this.geneMap.store({
        ...existingGene,
        avgRepairMs: immuneMs,
      });

      return {
        success: true,
        failure,
        candidates: [],
        winner: {
          id: existingGene.strategy,
          strategy: existingGene.strategy,
          description: `Immune: ${existingGene.strategy} (${existingGene.successCount} prior fixes)`,
          estimatedCostUsd: 0,
          estimatedSpeedMs: immuneMs,
          requirements: [],
          score: 100,
          successProbability: 0.99,
        },
        gene: existingGene,
        immune: true,
        totalMs: Date.now() - start,
        revenueProtected: revenue,
      };
    }

    // ── CONSTRUCT ──
    const candidates = construct(failure, this.geneMap);
    bus.emit('construct', this.agentId, {
      category: failure.category,
      candidateCount: candidates.length,
      candidates: candidates.map((c) => ({ id: c.id, strategy: c.strategy, description: c.description })),
    });

    // ── EVALUATE ──
    const scored = evaluate(candidates, failure);
    const winner = scored[0];
    bus.emit('evaluate', this.agentId, {
      winner: winner.strategy,
      score: winner.score,
      allScores: scored.map((c) => ({ strategy: c.strategy, score: c.score })),
    });

    // ── COMMIT ──
    const result = await commit(winner, failure, context);
    const totalMs = Date.now() - start;
    const revenue = REVENUE_AT_RISK[failure.category];

    if (result.success) {
      this.stats.repairs++;
      this.stats.savedRevenue += revenue;

      // Store Gene Capsule
      const gene: GeneCapsule = {
        failureCode: failure.code,
        category: failure.category,
        strategy: winner.strategy,
        params: { description: winner.description },
        successCount: 1,
        avgRepairMs: totalMs,
      };
      this.geneMap.store(gene);
      this.totalRepairCost += winner.estimatedCostUsd;
      this.cycleCount = 0;

      bus.emit('commit', this.agentId, {
        success: true,
        strategy: winner.strategy,
        result: result.result,
        totalMs,
      });

      bus.emit('gene', this.agentId, {
        code: failure.code,
        category: failure.category,
        strategy: winner.strategy,
        totalMs,
      });

      bus.emit('stats', this.agentId, {
        totalRepairs: this.stats.repairs,
        savedRevenue: this.stats.savedRevenue,
        immuneHits: this.stats.immuneHits,
        geneCount: this.geneMap.immuneCount(),
      });

      return {
        success: true,
        failure,
        candidates: scored,
        winner,
        gene,
        immune: false,
        totalMs,
        revenueProtected: revenue,
      };
    }

    bus.emit('commit', this.agentId, {
      success: false,
      strategy: winner.strategy,
      error: result.result,
      totalMs,
    });

    return {
      success: false,
      failure,
      candidates: scored,
      winner,
      gene: null,
      immune: false,
      totalMs,
      revenueProtected: 0,
    };
  }

  getStats() {
    return {
      ...this.stats,
      geneCount: this.geneMap.immuneCount(),
      genes: this.geneMap.list(),
    };
  }
}
