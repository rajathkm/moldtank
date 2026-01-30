// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK - CODE VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════
// Validates code submissions using E2B sandbox execution
// ═══════════════════════════════════════════════════════════════════════════

import { Sandbox } from '@e2b/code-interpreter';
import type { Submission, Bounty, BountyCriteria } from '@moldtank/database';
import type {
  Validator,
  ValidationResult,
  ValidationCheck,
  ValidationContext,
  CodePayload,
  TestCase,
  SandboxResult,
} from '../types';
import { createLLMJudge } from '../judge';

const VALIDATOR_VERSION = '1.0.0';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_TEST_TIMEOUT_MS = 5000;

/**
 * Code validator using E2B sandbox
 * 
 * Validates code submissions by:
 * 1. Running code in a secure sandbox
 * 2. Executing test cases
 * 3. Checking output correctness
 * 4. Optionally running LLM quality assessment
 */
export class CodeValidator implements Validator {
  readonly type = 'code' as const;
  private e2bApiKey?: string;

  constructor(config?: { e2bApiKey?: string }) {
    this.e2bApiKey = config?.e2bApiKey || process.env.E2B_API_KEY;
  }

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
      const payload = submission.payload as unknown as CodePayload;
      const criteria = bounty.criteria as BountyCriteria;

      // Check 1: Code exists
      if (!payload.code || typeof payload.code !== 'string') {
        checks.push({
          name: 'code_exists',
          passed: false,
          message: 'No code provided in submission',
        });
        return this.buildResult(false, 0, checks, startTime);
      }

      checks.push({
        name: 'code_exists',
        passed: true,
        message: 'Code submission found',
        details: { length: payload.code.length },
      });

      // Check 2: Language validation
      const language = payload.language || criteria.language || 'python';
      const supportedLanguages = ['python', 'javascript', 'typescript'];
      
      if (!supportedLanguages.includes(language.toLowerCase())) {
        checks.push({
          name: 'language_supported',
          passed: false,
          message: `Language "${language}" not supported. Use: ${supportedLanguages.join(', ')}`,
        });
        overallPassed = false;
        score -= 30;
      } else {
        checks.push({
          name: 'language_supported',
          passed: true,
          message: `Language "${language}" is supported`,
        });
      }

      // Check 3: Run test cases in sandbox
      const testCases = criteria.testCases || [];
      if (testCases.length > 0) {
        const testResults = await this.runTestCases(
          payload.code,
          language,
          testCases,
          context?.timeoutMs || DEFAULT_TIMEOUT_MS
        );

        let passedTests = 0;
        for (const result of testResults) {
          checks.push(result);
          if (result.passed) passedTests++;
        }

        const testScore = Math.round((passedTests / testCases.length) * 50);
        score = Math.min(score, testScore + 50); // Tests worth 50% of score

        if (passedTests < testCases.length) {
          overallPassed = false;
        }
      } else {
        // No test cases - just run the code to check it executes
        const execResult = await this.executeCode(payload.code, language);
        
        checks.push({
          name: 'code_executes',
          passed: execResult.exitCode === 0,
          message: execResult.exitCode === 0 
            ? 'Code executed successfully'
            : `Code execution failed: ${execResult.stderr || execResult.error}`,
          details: {
            stdout: execResult.stdout.slice(0, 500),
            stderr: execResult.stderr.slice(0, 500),
            exitCode: execResult.exitCode,
            executionTimeMs: execResult.executionTimeMs,
          },
        });

        if (execResult.exitCode !== 0) {
          overallPassed = false;
          score = Math.max(0, score - 40);
        }
      }

      // Check 4: LLM quality assessment (if requested)
      let llmAssessment;
      if (context?.runLLMAssessment !== false && criteria.requireLLMReview) {
        const judge = createLLMJudge();
        llmAssessment = await judge.assessCode(
          payload.code,
          bounty.description,
          criteria.customPrompt
        );

        checks.push({
          name: 'llm_quality',
          passed: llmAssessment.passed,
          message: `LLM assessment: ${llmAssessment.passed ? 'Passed' : 'Failed'} (${llmAssessment.score}/100)`,
          details: { reasoning: llmAssessment.reasoning },
        });

        // LLM assessment affects final score
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
   * Run test cases against the code in sandbox
   */
  private async runTestCases(
    code: string,
    language: string,
    testCases: TestCase[],
    timeoutMs: number
  ): Promise<ValidationCheck[]> {
    const results: ValidationCheck[] = [];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const testName = testCase.name || `test_${i + 1}`;

      try {
        const testCode = this.buildTestCode(code, language, testCase.input);
        const result = await this.executeCode(
          testCode,
          language,
          testCase.timeoutMs || DEFAULT_TEST_TIMEOUT_MS
        );

        const actualOutput = result.stdout.trim();
        const expectedOutput = testCase.expectedOutput.trim();
        const passed = actualOutput === expectedOutput;

        results.push({
          name: testName,
          passed,
          message: passed
            ? `Test passed: ${testName}`
            : `Test failed: expected "${expectedOutput}", got "${actualOutput}"`,
          details: {
            input: testCase.input,
            expected: expectedOutput,
            actual: actualOutput,
            executionTimeMs: result.executionTimeMs,
          },
          durationMs: result.executionTimeMs,
        });
      } catch (error) {
        results.push({
          name: testName,
          passed: false,
          message: `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: { input: testCase.input },
        });
      }
    }

    return results;
  }

  /**
   * Execute code in E2B sandbox
   */
  private async executeCode(
    code: string,
    language: string,
    timeoutMs: number = DEFAULT_TEST_TIMEOUT_MS
  ): Promise<SandboxResult> {
    if (!this.e2bApiKey) {
      // Fallback for development - just return mock result
      console.warn('E2B_API_KEY not set, returning mock execution result');
      return {
        stdout: '',
        stderr: 'E2B sandbox not configured',
        exitCode: 1,
        executionTimeMs: 0,
        error: 'E2B_API_KEY not configured',
      };
    }

    const startTime = Date.now();
    let sandbox: Sandbox | null = null;

    try {
      sandbox = await Sandbox.create({ apiKey: this.e2bApiKey });
      
      const execution = await sandbox.runCode(code, {
        language: language as 'python' | 'javascript',
        timeoutMs,
      });

      return {
        stdout: execution.logs.stdout.join('\n'),
        stderr: execution.logs.stderr.join('\n'),
        exitCode: execution.error ? 1 : 0,
        executionTimeMs: Date.now() - startTime,
        error: execution.error?.message,
      };
    } catch (error) {
      return {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Sandbox error',
        exitCode: 1,
        executionTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown sandbox error',
      };
    } finally {
      if (sandbox) {
        await sandbox.kill().catch(() => {});
      }
    }
  }

  /**
   * Build test code that runs the submission with given input
   */
  private buildTestCode(code: string, language: string, input: string): string {
    if (language === 'python') {
      return `${code}\n\n# Test execution\nresult = main(${JSON.stringify(input)})\nprint(result)`;
    }
    
    if (language === 'javascript' || language === 'typescript') {
      return `${code}\n\n// Test execution\nconsole.log(main(${JSON.stringify(input)}));`;
    }

    return code;
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
 * Create a code validator instance
 */
export function createCodeValidator(config?: { e2bApiKey?: string }): Validator {
  return new CodeValidator(config);
}
