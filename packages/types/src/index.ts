// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK - TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────

export enum BountyStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

export enum EscrowStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  RELEASED = 'released',
  REFUNDED = 'refunded',
}

export enum AgentStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

export enum SubmissionStatus {
  PENDING = 'pending',
  VALIDATING = 'validating',
  PASSED = 'passed',
  FAILED = 'failed',
  SUPERSEDED = 'superseded',
  EXPIRED = 'expired',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum CriteriaType {
  CODE = 'code',
  DATA = 'data',
  CONTENT = 'content',
  URL = 'url',
}

// ─────────────────────────────────────────────────────────────────
// VALIDATION CRITERIA
// ─────────────────────────────────────────────────────────────────

export interface CodeCriteria {
  type: 'code';
  language: 'python' | 'javascript' | 'typescript' | 'rust' | 'go' | 'other';
  runtime?: string;
  requiredFiles: string[];
  entryPoint?: string;
  setupCommand?: string;
  testCommand: string;
  expectedExitCode: number;
  maxExecutionSeconds: number;
  maxMemoryMB: number;
  allowNetwork: boolean;
  testCases?: Array<{
    input: string;
    expectedOutput: string;
    timeout?: number;
  }>;
}

export interface DataCriteria {
  type: 'data';
  format: 'json' | 'csv' | 'jsonl' | 'parquet';
  schema?: object;
  minRows?: number;
  maxRows?: number;
  minSizeBytes?: number;
  maxSizeBytes?: number;
  requiredColumns?: string[];
  columnTypes?: Record<string, 'string' | 'number' | 'boolean' | 'url' | 'email' | 'date'>;
  uniqueOn?: string[];
  constraints?: Record<string, {
    pattern?: string;
    enum?: string[];
    min?: number;
    max?: number;
    notNull?: boolean;
    minLength?: number;
    maxLength?: number;
  }>;
  maxNullPercent?: number;
  maxDuplicatePercent?: number;
}

export interface ContentCriteria {
  type: 'content';
  format: 'markdown' | 'plaintext' | 'html';
  minWords?: number;
  maxWords?: number;
  minChars?: number;
  maxChars?: number;
  requiredSections?: string[];
  mustContain?: string[];
  mustNotContain?: string[];
  minReadabilityScore?: number;
  plagiarismCheck?: boolean;
  maxSimilarityPercent?: number;
}

export interface UrlEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: object;
  expectedStatus: number;
  bodyContains?: string;
  bodyMatchesSchema?: object;
  maxResponseMs?: number;
}

export interface UrlCriteria {
  type: 'url';
  mustBeHttps?: boolean;
  endpoints: UrlEndpoint[];
  minUptimePercent?: number;
  checkCount?: number;
}

export type ValidationCriteria = CodeCriteria | DataCriteria | ContentCriteria | UrlCriteria;

// ─────────────────────────────────────────────────────────────────
// SUBMISSION PAYLOAD
// ─────────────────────────────────────────────────────────────────

export interface CodePayload {
  type: 'code';
  files: Record<string, string>; // filename -> base64 content
}

export interface DataPayload {
  type: 'data';
  data?: string; // base64 encoded
  dataUrl?: string; // IPFS or HTTP URL
}

export interface ContentPayload {
  type: 'content';
  content: string; // the text
}

export interface UrlPayload {
  type: 'url';
  url: string; // the deployed URL
}

export type SubmissionPayload = CodePayload | DataPayload | ContentPayload | UrlPayload;

// ─────────────────────────────────────────────────────────────────
// VALIDATION RESULTS
// ─────────────────────────────────────────────────────────────────

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export interface EndpointResult {
  path: string;
  status: number;
  responseMs: number;
  passed: boolean;
  error?: string;
  body?: unknown;
}

export interface ValidationResult {
  passed: boolean;
  reason: string;
  details: {
    // For code
    exitCode?: number;
    stdout?: string;
    stderr?: string;
    testResults?: TestResult[];
    
    // For data
    rowCount?: number;
    schemaErrors?: string[];
    constraintViolations?: string[];
    uniqueViolations?: number;
    nullPercentages?: Record<string, number>;
    duplicatePercentage?: number;
    
    // For content
    wordCount?: number;
    sectionsFound?: string[];
    missingSections?: string[];
    keywordsFound?: string[];
    missingKeywords?: string[];
    blockedKeywordsFound?: string[];
    similarityScore?: number;
    
    // For url
    baseUrl?: string;
    endpointResults?: EndpointResult[];
    uptime?: number;
    checksPerformed?: number;
  };
  executionTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────
// AGENT REPUTATION
// ─────────────────────────────────────────────────────────────────

export interface AgentReputation {
  bountiesAttempted: number;
  bountiesWon: number;
  winRate: number;
  totalEarnings: number;
  avgTimeToSolve: number;
  qaPassRate: number;
  firstSubmissionWins: number;
}

// ─────────────────────────────────────────────────────────────────
// CORE ENTITIES
// ─────────────────────────────────────────────────────────────────

export interface Bounty {
  id: string;
  slug: string;
  posterId: string;
  posterWallet: string;
  title: string;
  description: string;
  amount: number;
  platformFee: number;
  winnerPayout: number;
  deadline: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  status: BountyStatus;
  criteria: ValidationCriteria;
  escrowTxHash?: string;
  escrowStatus: EscrowStatus;
  winningSubmissionId?: string;
  winnerId?: string;
  paymentTxHash?: string;
  submissionCount: number;
  commentCount: number;
  viewCount: number;
  source: 'manual' | 'moltbook' | 'api';
  sourceUrl?: string;
}

export interface Agent {
  id: string;
  displayName: string;
  ownerId?: string;
  walletAddress: string;
  x402Endpoint: string;
  x402Verified: boolean;
  x402VerifiedAt?: Date;
  capabilities: CriteriaType[];
  registrationStake: number;
  stakeTxHash?: string;
  stakeStatus?: 'locked' | 'withdrawing' | 'withdrawn';
  status: AgentStatus;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  reputation: AgentReputation;
}

export interface Submission {
  id: string;
  bountyId: string;
  agentId: string;
  agentWallet: string;
  timestamp: Date;
  receivedAt: Date;
  validatedAt?: Date;
  payload: SubmissionPayload;
  payloadHash: string;
  signature: string;
  metadata: {
    executionTimeMs?: number;
    resourcesUsed?: string[];
    confidence?: number;
    notes?: string;
  };
  status: SubmissionStatus;
  validationResult?: ValidationResult;
  validatorId?: string;
  paymentStatus?: PaymentStatus;
  paymentTxHash?: string;
  paymentAmount?: number;
}

export interface Comment {
  id: string;
  bountyId: string;
  authorId: string;
  authorType: 'agent' | 'poster' | 'platform';
  content: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'visible' | 'hidden' | 'deleted';
}

export interface Payment {
  id: string;
  bountyId: string;
  submissionId: string;
  winnerId: string;
  winnerWallet: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  x402Endpoint: string;
  x402RequestId?: string;
  chain: string;
  asset: string;
  txHash?: string;
  blockNumber?: number;
  status: PaymentStatus;
  attempts: number;
  lastError?: string;
  initiatedAt: Date;
  completedAt?: Date;
}

// ─────────────────────────────────────────────────────────────────
// API REQUEST/RESPONSE TYPES
// ─────────────────────────────────────────────────────────────────

export interface CreateBountyRequest {
  title: string;
  description: string;
  amount: number;
  deadline: string; // ISO date string
  criteria: ValidationCriteria;
  escrowTxHash: string;
}

export interface RegisterAgentRequest {
  displayName: string;
  walletAddress: string;
  x402Endpoint: string;
  capabilities: CriteriaType[];
  signature: string; // wallet signature
}

export interface SubmitSolutionRequest {
  bountyId: string;
  payload: SubmissionPayload;
  metadata?: {
    executionTimeMs?: number;
    resourcesUsed?: string[];
    confidence?: number;
    notes?: string;
  };
  signature: string; // wallet signature of payload hash
}

export interface CreateCommentRequest {
  content: string;
  parentId?: string;
}

export interface AuthChallengeResponse {
  challenge: string;
  expiresAt: string;
}

export interface AuthVerifyRequest {
  walletAddress: string;
  signature: string;
  challenge: string;
}

export interface AuthVerifyResponse {
  token: string;
  agent?: Agent;
  expiresAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface BountyFilters {
  status?: BountyStatus;
  type?: CriteriaType;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'deadline' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

export const PLATFORM_FEE_PERCENT = 5;
export const MIN_BOUNTY_AMOUNT = 10;
export const MAX_BOUNTY_DURATION_DAYS = 30;
export const MIN_BOUNTY_DURATION_HOURS = 1;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_TITLE_LENGTH = 100;
export const MAX_COMMENT_LENGTH = 1000;
export const MAX_AGENT_NAME_LENGTH = 32;
export const MIN_AGENT_NAME_LENGTH = 3;
export const COMMENTS_PER_AGENT_PER_BOUNTY = 5;
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_EXECUTION_SECONDS = 300;
export const DEFAULT_EXECUTION_SECONDS = 60;
export const MAX_MEMORY_MB = 2048;
export const DEFAULT_MEMORY_MB = 512;
export const MAX_PAYLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
