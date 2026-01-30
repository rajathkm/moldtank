// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK - URL VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════
// Validates URL/API endpoint submissions
// ═══════════════════════════════════════════════════════════════════════════

import Ajv from 'ajv';
import type { Submission, Bounty, BountyCriteria } from '@moldtank/database';
import type {
  Validator,
  ValidationResult,
  ValidationCheck,
  ValidationContext,
  URLPayload,
} from '../types';
import { createLLMJudge } from '../judge';

const VALIDATOR_VERSION = '1.0.0';
const DEFAULT_TIMEOUT_MS = 10000;
const ajv = new Ajv({ allErrors: true });

interface HTTPResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  responseTimeMs: number;
  error?: string;
}

/**
 * URL validator for API endpoint submissions
 * 
 * Validates URL submissions by:
 * 1. URL format validation
 * 2. Making HTTP request
 * 3. Checking response status
 * 4. Validating response body against schema
 * 5. Optional LLM assessment of response quality
 */
export class URLValidator implements Validator {
  readonly type = 'url' as const;

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
      const payload = submission.payload as unknown as URLPayload;
      const criteria = bounty.criteria as BountyCriteria;

      // Check 1: URL exists
      if (!payload.url || typeof payload.url !== 'string') {
        checks.push({
          name: 'url_exists',
          passed: false,
          message: 'No URL provided in submission',
        });
        return this.buildResult(false, 0, checks, startTime);
      }

      // Check 2: URL format
      let url: URL;
      try {
        url = new URL(payload.url);
        checks.push({
          name: 'url_valid',
          passed: true,
          message: 'URL format is valid',
          details: { protocol: url.protocol, host: url.host },
        });
      } catch {
        checks.push({
          name: 'url_valid',
          passed: false,
          message: 'Invalid URL format',
          details: { url: payload.url },
        });
        return this.buildResult(false, 0, checks, startTime);
      }

      // Check 3: HTTPS requirement
      if (url.protocol !== 'https:') {
        checks.push({
          name: 'url_https',
          passed: false,
          message: 'URL must use HTTPS',
          details: { protocol: url.protocol },
        });
        score -= 20;
      } else {
        checks.push({
          name: 'url_https',
          passed: true,
          message: 'URL uses HTTPS',
        });
      }

      // Check 4: Make HTTP request
      const method = payload.method || criteria.httpMethod || 'GET';
      const timeoutMs = context?.timeoutMs || DEFAULT_TIMEOUT_MS;
      
      const response = await this.makeRequest(
        payload.url,
        method,
        payload.headers,
        payload.body,
        timeoutMs
      );

      if (response.error) {
        checks.push({
          name: 'request_success',
          passed: false,
          message: `Request failed: ${response.error}`,
          details: { responseTimeMs: response.responseTimeMs },
        });
        return this.buildResult(false, 20, checks, startTime);
      }

      // Check 5: Status code
      const expectedStatus = criteria.expectedStatus || 200;
      const statusOk = response.status === expectedStatus;

      checks.push({
        name: 'status_code',
        passed: statusOk,
        message: statusOk
          ? `Status code is ${expectedStatus} as expected`
          : `Expected status ${expectedStatus}, got ${response.status}`,
        details: {
          expected: expectedStatus,
          actual: response.status,
          statusText: response.statusText,
        },
      });

      if (!statusOk) {
        overallPassed = false;
        score -= 30;
      }

      // Check 6: Response time
      const maxResponseTimeMs = 5000; // 5 second max
      const responseTimeFast = response.responseTimeMs < maxResponseTimeMs;

      checks.push({
        name: 'response_time',
        passed: responseTimeFast,
        message: responseTimeFast
          ? `Response time acceptable (${response.responseTimeMs}ms)`
          : `Response too slow (${response.responseTimeMs}ms > ${maxResponseTimeMs}ms)`,
        details: { responseTimeMs: response.responseTimeMs },
        durationMs: response.responseTimeMs,
      });

      if (!responseTimeFast) {
        score -= 10;
      }

      // Check 7: Response body schema validation
      if (criteria.responseSchema && response.body) {
        const schemaResult = this.validateResponseSchema(
          response.body,
          criteria.responseSchema
        );
        checks.push(schemaResult);

        if (!schemaResult.passed) {
          overallPassed = false;
          score -= 25;
        }
      }

      // Check 8: LLM assessment (if requested)
      let llmAssessment;
      if (context?.runLLMAssessment !== false && criteria.requireLLMReview && response.body) {
        const judge = createLLMJudge();
        llmAssessment = await judge.assessAPIResponse(
          response.body,
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
   * Make HTTP request with timeout
   */
  private async makeRequest(
    url: string,
    method: string,
    headers?: Record<string, string>,
    body?: unknown,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): Promise<HTTPResponse> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Accept': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const responseTimeMs = Date.now() - startTime;

      // Parse response body
      let responseBody: unknown;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        try {
          responseBody = await response.json();
        } catch {
          responseBody = await response.text();
        }
      } else {
        responseBody = await response.text();
      }

      // Convert headers to plain object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        responseTimeMs,
      };
    } catch (error) {
      return {
        status: 0,
        statusText: '',
        headers: {},
        body: null,
        responseTimeMs: Date.now() - startTime,
        error: error instanceof Error 
          ? (error.name === 'AbortError' ? 'Request timeout' : error.message)
          : 'Unknown error',
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Validate response body against JSON schema
   */
  private validateResponseSchema(
    body: unknown,
    schema: Record<string, unknown>
  ): ValidationCheck {
    try {
      const validate = ajv.compile(schema);
      const valid = validate(body);

      if (valid) {
        return {
          name: 'response_schema',
          passed: true,
          message: 'Response matches expected schema',
        };
      }

      return {
        name: 'response_schema',
        passed: false,
        message: `Response schema validation failed: ${validate.errors?.length || 0} errors`,
        details: {
          errors: validate.errors?.slice(0, 5).map(e => ({
            path: e.instancePath,
            message: e.message,
          })),
        },
      };
    } catch (error) {
      return {
        name: 'response_schema',
        passed: false,
        message: `Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
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
 * Create a URL validator instance
 */
export function createURLValidator(): Validator {
  return new URLValidator();
}
