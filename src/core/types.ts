// ── MPP Protocol Types ──────────────────────────────────────────────

export type MppErrorCode =
  | 'payment-required'
  | 'payment-insufficient'
  | 'payment-expired'
  | 'verification-failed'
  | 'method-unsupported'
  | 'malformed-credential'
  | 'invalid-challenge'
  | 'tx-reverted'
  | 'swap-reverted'
  | 'tip-403'
  | 'cascade-failure'
  | 'offramp-failed';

export type FailureCategory =
  | 'balance'
  | 'session'
  | 'currency'
  | 'signature'
  | 'batch'
  | 'service'
  | 'dex'
  | 'compliance'
  | 'cascade'
  | 'offramp';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

// ── PCEC Types ──────────────────────────────────────────────────────

export interface FailureClassification {
  code: MppErrorCode;
  category: FailureCategory;
  severity: Severity;
  details: string;
  rawError: unknown;
  timestamp: number;
  actualBalance?: number;
  requiredAmount?: number;
}

export interface RepairCandidate {
  id: string;
  strategy: string;
  description: string;
  estimatedCostUsd: number;
  estimatedSpeedMs: number;
  requirements: string[];
  score: number;
  successProbability: number; // 0-1, based on Gene Map history, default 0.5
}

export interface GeneCapsule {
  id?: number;
  failureCode: MppErrorCode;
  category: FailureCategory;
  strategy: string;
  params: Record<string, unknown>;
  successCount: number;
  avgRepairMs: number;
  createdAt?: string;
  lastUsedAt?: string;
}

export interface RepairResult {
  success: boolean;
  failure: FailureClassification;
  candidates: RepairCandidate[];
  winner: RepairCandidate | null;
  gene: GeneCapsule | null;
  immune: boolean;
  totalMs: number;
  revenueProtected: number;
}

// ── SSE Event Types ─────────────────────────────────────────────────

export type SseEventType =
  | 'perceive'
  | 'construct'
  | 'evaluate'
  | 'commit'
  | 'gene'
  | 'immune'
  | 'error'
  | 'stats'
  | 'retry';

export interface SseEvent {
  type: SseEventType;
  agentId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

// ── Config ──────────────────────────────────────────────────────────

export interface HelixConfig {
  projectName: string;
  walletAddress: string;
  stablecoins: string[];
  monthlyBudget: number;
  maxRetries: number;
  timeoutMs: number;
  dashboardPort: number;
  verbose: boolean;
  geneMapPath: string;
}

export interface WrapOptions {
  agentId?: string;
  config?: Partial<HelixConfig>;
  maxRetries?: number;
  verbose?: boolean;
}

// ── MPP Protocol ────────────────────────────────────────────────────

export interface MppChallenge {
  type: 'payment-challenge';
  version: '1.0';
  payTo: string;
  amount: string;
  currency: string;
  network: 'tempo';
  sessionId?: string;
  expiresAt: string;
  nonce: string;
}

export interface MppReceipt {
  type: 'payment-receipt';
  txHash: string;
  amount: string;
  currency: string;
  payer: string;
  payee: string;
  timestamp: string;
  sessionId?: string;
}

// ── Repair Context ──────────────────────────────────────────────────

export interface RepairContext {
  agentId: string;
  walletAddress: string;
  availableBalances: Record<string, number>;
  currentSession?: { id: string; expiresAt: string };
  lastReceipt?: MppReceipt;
  batchItems?: unknown[];
  targetCurrency?: string;
}

export const DEFAULT_CONFIG: HelixConfig = {
  projectName: 'helix-agent',
  walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
  stablecoins: ['USDC', 'USDT', 'DAI'],
  monthlyBudget: 10000,
  maxRetries: 3,
  timeoutMs: 30000,
  dashboardPort: 3710,
  verbose: true,
  geneMapPath: './helix-genes.db',
};
