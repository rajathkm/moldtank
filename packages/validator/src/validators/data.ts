// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK - DATA VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════
// Validates data submissions using JSON schema validation
// ═══════════════════════════════════════════════════════════════════════════

import Ajv, { ValidateFunction } from 'ajv';
import type { Submission, Bounty, BountyCriteria } from '@moldtank/database';
import type {
  Validator,
  ValidationResult,
  ValidationCheck,
  ValidationContext,
  DataPayload,
} from '../types';
import { createLLMJudge } from '../judge';

const VALIDATOR_VERSION = '1.0.0';
const ajv = new Ajv({ allErrors: true, verbose: true });

/**
 * Data validator using JSON Schema
 * 
 * Validates data submissions by:
 * 1. Checking data format (JSON array)
 * 2. Validating against JSON schema if provided
 * 3. Checking minimum record count
 * 4. Optionally running LLM quality assessment
 */
export class DataValidator implements Validator {
  readonly type = 'data' as const;

  async validate(
    submission: Submission,
    bounty: Bounty,
    context?: Partial<ValidationContext>
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const checks: ValidationCheck[] = [];
    let overallPassed = true;
    let score = 100;

    try {
      const payload = submission.payload as unknown as DataPayload;
      const criteria = bounty.criteria as BountyCriteria;

      // Check 1: Data exists and is array
      if (!payload.data) {
        checks.push({
          name: 'data_exists',
          passed: false,
          message: 'No data provided in submission',
        });
        return this.buildResult(false, 0, checks, startTime);
      }

      if (!Array.isArray(payload.data)) {
        checks.push({
          name: 'data_is_array',
          passed: false,
          message: 'Data must be an array',
        });
        return this.buildResult(false, 0, checks, startTime);
      }

      checks.push({
        name: 'data_exists',
        passed: true,
        message: `Data array found with ${payload.data.length} records`,
        details: { recordCount: payload.data.length },
      });

      // Check 2: Minimum records
      const minRecords = criteria.minRecords || 1;
      if (payload.data.length < minRecords) {
        checks.push({
          name: 'min_records',
          passed: false,
          message: `Minimum ${minRecords} records required, got ${payload.data.length}`,
          details: { required: minRecords, actual: payload.data.length },
        });
        overallPassed = false;
        score -= 30;
      } else {
        checks.push({
          name: 'min_records',
          passed: true,
          message: `Record count meets minimum (${payload.data.length} >= ${minRecords})`,
        });
      }

      // Check 3: JSON Schema validation
      if (criteria.schema) {
        const schemaResult = this.validateSchema(payload.data, criteria.schema);
        checks.push(schemaResult);

        if (!schemaResult.passed) {
          overallPassed = false;
          score -= 40;
        }
      }

      // Check 4: Data quality checks
      const qualityChecks = this.checkDataQuality(payload.data);
      checks.push(...qualityChecks);

      const failedQualityChecks = qualityChecks.filter(c => !c.passed).length;
      if (failedQualityChecks > 0) {
        score -= failedQualityChecks * 10;
      }

      // Check 5: LLM quality assessment (if requested)
      let llmAssessment;
      if (context?.runLLMAssessment !== false && criteria.requireLLMReview) {
        const judge = createLLMJudge();
        llmAssessment = await judge.assessData(
          payload.data,
          bounty.description,
          criteria.customPrompt
        );

        checks.push({
          name: 'llm_quality',
          passed: llmAssessment.passed,
          message: `LLM assessment: ${llmAssessment.passed ? 'Passed' : 'Failed'} (${llmAssessment.score}/100)`,
          details: { reasoning: llmAssessment.reasoning },
        });

        score = Math.round((score + llmAssessment.score) / 2);
        if (!llmAssessment.passed) {
          overallPassed = false;
        }
      }

      return this.buildResult(overallPassed, score, checks, startTime, llmAssessment);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.buildResult(false, 0, checks, startTime, undefined, errorMessage);
    }
  }

  /**
   * Validate data against JSON schema
   */
  private validateSchema(
    data: unknown[],
    schema: Record<string, unknown>
  ): ValidationCheck {
    try {
      // Wrap schema for array validation
      const arraySchema = {
        type: 'array',
        items: schema,
      };

      let validate: ValidateFunction;
      try {
        validate = ajv.compile(arraySchema);
      } catch (compileError) {
        return {
          name: 'schema_validation',
          passed: false,
          message: `Invalid schema: ${compileError instanceof Error ? compileError.message : 'Unknown error'}`,
        };
      }

      const valid = validate(data);

      if (valid) {
        return {
          name: 'schema_validation',
          passed: true,
          message: 'All records match the expected schema',
        };
      }

      // Count errors by type
      const errorCounts: Record<string, number> = {};
      for (const error of validate.errors || []) {
        const key = error.keyword || 'unknown';
        errorCounts[key] = (errorCounts[key] || 0) + 1;
      }

      return {
        name: 'schema_validation',
        passed: false,
        message: `Schema validation failed: ${validate.errors?.length || 0} errors`,
        details: {
          errorCounts,
          sampleErrors: validate.errors?.slice(0, 5).map(e => ({
            path: e.instancePath,
            message: e.message,
            keyword: e.keyword,
          })),
        },
      };
    } catch (error) {
      return {
        name: 'schema_validation',
        passed: false,
        message: `Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Run basic data quality checks
   */
  private checkDataQuality(data: unknown[]): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Check for empty records
    const emptyRecords = data.filter(
      r => r === null || r === undefined || 
      (typeof r === 'object' && Object.keys(r as object).length === 0)
    ).length;

    if (emptyRecords > 0) {
      checks.push({
        name: 'no_empty_records',
        passed: emptyRecords === 0,
        message: emptyRecords === 0
          ? 'No empty records found'
          : `Found ${emptyRecords} empty records`,
        details: { emptyCount: emptyRecords },
      });
    }

    // Check for duplicates (by JSON stringification)
    const seen = new Set<string>();
    let duplicates = 0;
    for (const record of data) {
      const key = JSON.stringify(record);
      if (seen.has(key)) {
        duplicates++;
      }
      seen.add(key);
    }

    checks.push({
      name: 'no_duplicates',
      passed: duplicates === 0,
      message: duplicates === 0
        ? 'No duplicate records found'
        : `Found ${duplicates} duplicate records`,
      details: { duplicateCount: duplicates },
    });

    // Check for consistent structure (if objects)
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      const firstKeys = Object.keys(data[0] as object).sort().join(',');
      let inconsistent = 0;

      for (const record of data) {
        if (typeof record === 'object' && record !== null) {
          const keys = Object.keys(record as object).sort().join(',');
          if (keys !== firstKeys) {
            inconsistent++;
          }
        }
      }

      checks.push({
        name: 'consistent_structure',
        passed: inconsistent === 0,
        message: inconsistent === 0
          ? 'All records have consistent structure'
          : `Found ${inconsistent} records with inconsistent structure`,
        details: { inconsistentCount: inconsistent },
      });
    }

    return checks;
  }

  /**
   * Build the final validation result
   */
  private buildResult(
    passed: boolean,
    score: number,
    checks: ValidationCheck[],
    startTime: number,
    llmAssessment?: ValidationResult['llmAssessment'],
    error?: string
  ): ValidationResult {
    return {
      passed,
      score: Math.max(0, Math.min(100, score)),
      checks,
      llmAssessment,
      error,
      validatedAt: new Date().toISOString(),
      validatorVersion: VALIDATOR_VERSION,
      totalDurationMs: Date.now() - startTime,
    };
  }
}

/**
 * Create a data validator instance
 */
export function createDataValidator(): Validator {
  return new DataValidator();
}
