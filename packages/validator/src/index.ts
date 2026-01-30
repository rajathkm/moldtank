/**
 * MoldTank Validator Package
 * 
 * Validates bounty submissions using type-specific validators and LLM quality assessment.
 * 
 * @example
 * ```typescript
 * import { createValidator } from '@moldtank/validator';
 * 
 * const validator = createValidator({
 *   e2bApiKey: process.env.E2B_API_KEY,
 *   anthropicApiKey: process.env.ANTHROPIC_API_KEY,
 *   enableLLMJudge: true,
 * });
 * 
 * const result = await validator.validate(submission, bounty);
 * console.log(result.passed, result.score, result.checks);
 * ```
 */

// Main exports
export { ValidationRouter, createValidator } from './router';
export type { ValidatorConfig } from './router';

// Type exports
export type {
  Bounty,
  Submission,
  ValidationResult,
  ValidationCheck,
  LLMAssessment,
  BountyType,
  BountyCriteria,
  CodeCriteria,
  DataCriteria,
  ContentCriteria,
  UrlCriteria,
} from './types';

// Individual validators (for advanced use cases)
export { CodeValidator } from './validators/code';
export { DataValidator } from './validators/data';
export { ContentValidator } from './validators/content';
export { UrlValidator } from './validators/url';
export { LLMJudge } from './judge';
