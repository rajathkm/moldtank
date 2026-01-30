/**
 * Validation Router
 * Routes submissions to the appropriate validator based on bounty type
 */

import type { Bounty, Submission, ValidationResult } from './types';
import { CodeValidator } from './validators/code';
import { DataValidator } from './validators/data';
import { ContentValidator } from './validators/content';
import { UrlValidator } from './validators/url';
import { LLMJudge } from './judge';

export interface ValidatorConfig {
  e2bApiKey?: string;
  anthropicApiKey?: string;
  enableLLMJudge?: boolean;
}

/**
 * Main validation router that orchestrates the validation pipeline
 */
export class ValidationRouter {
  private codeValidator: CodeValidator;
  private dataValidator: DataValidator;
  private contentValidator: ContentValidator;
  private urlValidator: UrlValidator;
  private llmJudge: LLMJudge;
  private config: ValidatorConfig;

  constructor(config: ValidatorConfig) {
    this.config = config;
    this.codeValidator = new CodeValidator(config.e2bApiKey);
    this.dataValidator = new DataValidator();
    this.contentValidator = new ContentValidator();
    this.urlValidator = new UrlValidator();
    this.llmJudge = new LLMJudge(config.anthropicApiKey);
  }

  /**
   * Validate a submission against a bounty's criteria
   */
  async validate(submission: Submission, bounty: Bounty): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Route to type-specific validator
      let result: ValidationResult;
      
      switch (bounty.type) {
        case 'code':
          result = await this.codeValidator.validate(submission, bounty);
          break;
        case 'data':
          result = await this.dataValidator.validate(submission, bounty);
          break;
        case 'content':
          result = await this.contentValidator.validate(submission, bounty);
          break;
        case 'url':
          result = await this.urlValidator.validate(submission, bounty);
          break;
        default:
          return {
            passed: false,
            score: 0,
            checks: [],
            error: `Unknown bounty type: ${bounty.type}`,
            validatedAt: new Date().toISOString(),
            validationTimeMs: Date.now() - startTime,
          };
      }

      // Step 2: If basic checks passed and LLM judge is enabled, do quality assessment
      if (result.passed && this.config.enableLLMJudge && this.config.anthropicApiKey) {
        const llmAssessment = await this.llmJudge.assess(submission, bounty, result);
        result.llmAssessment = llmAssessment;
        
        // LLM can override the pass/fail decision
        if (!llmAssessment.passed) {
          result.passed = false;
          result.score = Math.min(result.score, llmAssessment.score);
        }
      }

      result.validationTimeMs = Date.now() - startTime;
      return result;

    } catch (error) {
      return {
        passed: false,
        score: 0,
        checks: [],
        error: error instanceof Error ? error.message : 'Validation failed',
        validatedAt: new Date().toISOString(),
        validationTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Quick validation check without LLM (for preview/dry-run)
   */
  async quickValidate(submission: Submission, bounty: Bounty): Promise<ValidationResult> {
    const originalConfig = this.config.enableLLMJudge;
    this.config.enableLLMJudge = false;
    
    try {
      return await this.validate(submission, bounty);
    } finally {
      this.config.enableLLMJudge = originalConfig;
    }
  }
}

/**
 * Factory function to create a validation router
 */
export function createValidator(config: ValidatorConfig): ValidationRouter {
  return new ValidationRouter(config);
}
