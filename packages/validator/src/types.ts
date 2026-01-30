// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK - VALIDATOR TYPES
// ═══════════════════════════════════════════════════════════════════════════

import type { Submission, Bounty, BountyType } from '@moldtank/database';

/**
 * Individual validation check result
 */
export interface ValidationCheck {
  /** Check name/identifier */
  name: string;
  /** Whether the check passed */
  passed: boolean;
  /** Human-readable message */
  message: string;
  /** Additional details */
  details?: Record<string, unknown>;
  /** Time taken for this check (ms) */
  durationMs?: number;
}

/**
 * LLM quality assessment result
 */
export interface LLMAssessment {
  /** Whether the submission meets quality standards */
  passed: boolean;
  /** Quality score (0-100) */
  score: number;
  /** LLM's reasoning for the assessment */
  reasoning: string;
  /** Specific feedback points */
  feedback?: string[];
  /** Token usage */
  tokensUsed?: number;
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  /** Overall pass/fail */
  passed: boolean;
  /** Overall score (0-100) */
  score: number;
  /** Individual checks performed */
  checks: ValidationCheck[];
  /** Optional LLM quality assessment */
  llmAssessment?: LLMAssessment;
  /** Error message if validation failed catastrophically */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: string;
  /** When validation completed */
  validatedAt: string;
  /** Version of the validator used */
  validatorVersion: string;
  /** Total validation time (ms) */
  totalDurationMs?: number;
}

/**
 * Context passed to validators
 */
export interface ValidationContext {
  /** The submission being validated */
  submission: Submission;
  /** The bounty being solved */
  bounty: Bounty;
  /** Optional timeout (ms) */
  timeoutMs?: number;
  /** Whether to run LLM assessment */
  runLLMAssessment?: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Validator interface - implemented by type-specific validators
 */
export interface Validator {
  /** Bounty type this validator handles */
  readonly type: BountyType;
  
  /**
   * Validate a submission against a bounty
   * @param submission - The submission to validate
   * @param bounty - The bounty requirements
   * @param context - Optional additional context
   * @returns Validation result
   */
  validate(
    submission: Submission,
    bounty: Bounty,
    context?: Partial<ValidationContext>
  ): Promise<ValidationResult>;
}

/**
 * Code submission payload structure
 */
export interface CodePayload {
  code: string;
  language?: string;
  entryPoint?: string;
  dependencies?: string[];
}

/**
 * Data submission payload structure
 */
export interface DataPayload {
  data: unknown[];
  format?: 'json' | 'csv';
  schema?: Record<string, unknown>;
}

/**
 * Content submission payload structure
 */
export interface ContentPayload {
  content: string;
  format?: 'text' | 'markdown' | 'html';
  metadata?: Record<string, unknown>;
}

/**
 * URL submission payload structure
 */
export interface URLPayload {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

/**
 * Test case for code validation
 */
export interface TestCase {
  input: string;
  expectedOutput: string;
  name?: string;
  timeoutMs?: number;
}

/**
 * E2B sandbox execution result
 */
export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  error?: string;
}
