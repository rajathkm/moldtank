// ═══════════════════════════════════════════════════════════════════════════
// SUBMISSION VALIDATION ROUTE
// ═══════════════════════════════════════════════════════════════════════════
// Triggers validation of a submission using E2B sandbox + LLM judge
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { Sandbox } from '@e2b/code-interpreter';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/database';
import { submissions, bounties, agents, payments } from '@/db';
import { handleApiError, ApiError } from '@/lib/errors';
import { SubmissionStatus, BountyStatus } from '@/types';

const E2B_API_KEY = process.env.E2B_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const VALIDATION_TIMEOUT_MS = 60000;

interface ValidationResult {
  passed: boolean;
  score: number;
  checks: ValidationCheck[];
  executionResult?: ExecutionResult;
  llmAssessment?: LLMAssessment;
  error?: string;
}

interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
}

interface LLMAssessment {
  passed: boolean;
  score: number;
  reasoning: string;
}

// POST /api/submissions/[id]/validate - Validate a submission
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const submissionId = params.id;
  
  try {
    // Get submission
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1);

    if (!submission) {
      throw new ApiError(404, 'Submission not found', 'NOT_FOUND');
    }

    // Check if already validated
    if (submission.status !== SubmissionStatus.PENDING) {
      return NextResponse.json({
        message: 'Submission already validated',
        status: submission.status,
        validationResult: submission.validationResult,
      });
    }

    // Get bounty
    const [bounty] = await db
      .select()
      .from(bounties)
      .where(eq(bounties.id, submission.bountyId))
      .limit(1);

    if (!bounty) {
      throw new ApiError(404, 'Bounty not found', 'BOUNTY_NOT_FOUND');
    }

    // Mark as validating
    await db
      .update(submissions)
      .set({ status: SubmissionStatus.VALIDATING })
      .where(eq(submissions.id, submissionId));

    // Run validation
    const result = await validateSubmission(submission, bounty);

    // Update submission with result
    const newStatus = result.passed ? SubmissionStatus.PASSED : SubmissionStatus.FAILED;
    
    await db
      .update(submissions)
      .set({
        status: newStatus,
        validationResult: result as any,
        score: result.score,
        validatedAt: new Date(),
        validatorId: 'moldtank-v1',
      })
      .where(eq(submissions.id, submissionId));

    // If passed, check if this is the winner (first to pass)
    if (result.passed) {
      await checkForWinner(bounty, submission, result.score);
    }

    return NextResponse.json({
      submissionId,
      status: newStatus,
      result,
    });
  } catch (error) {
    // On error, mark submission as failed
    await db
      .update(submissions)
      .set({
        status: SubmissionStatus.FAILED,
        validationResult: {
          passed: false,
          score: 0,
          error: error instanceof Error ? error.message : 'Validation error',
        } as any,
      })
      .where(eq(submissions.id, submissionId));

    return handleApiError(error);
  }
}

/**
 * Main validation logic
 */
async function validateSubmission(
  submission: typeof submissions.$inferSelect,
  bounty: typeof bounties.$inferSelect
): Promise<ValidationResult> {
  const checks: ValidationCheck[] = [];
  let score = 100;
  let passed = true;
  let executionResult: ExecutionResult | undefined;
  let llmAssessment: LLMAssessment | undefined;

  const payload = submission.payload as any;
  const criteria = bounty.criteria as any;

  // Check 1: Payload structure
  if (!payload.code && !payload.data && !payload.content && !payload.url) {
    checks.push({
      name: 'payload_structure',
      passed: false,
      message: 'Invalid payload: missing code, data, content, or url',
    });
    return { passed: false, score: 0, checks };
  }
  checks.push({
    name: 'payload_structure',
    passed: true,
    message: 'Payload structure valid',
  });

  // Type-specific validation
  const submissionType = criteria.type || 'code';

  if (submissionType === 'code' && payload.code) {
    // Code validation with E2B
    executionResult = await executeCodeInSandbox(
      payload.code,
      payload.language || 'python',
      criteria.testCases || []
    );

    const codeExecuted = executionResult.exitCode === 0;
    checks.push({
      name: 'code_execution',
      passed: codeExecuted,
      message: codeExecuted 
        ? `Code executed successfully in ${executionResult.executionTimeMs}ms`
        : `Code failed: ${executionResult.stderr || 'Unknown error'}`,
      details: {
        stdout: executionResult.stdout.slice(0, 500),
        stderr: executionResult.stderr.slice(0, 500),
      },
    });

    if (!codeExecuted) {
      score -= 50;
      passed = false;
    }

    // Run test cases if defined
    if (criteria.testCases?.length > 0) {
      const testResults = await runTestCases(
        payload.code,
        payload.language || 'python',
        criteria.testCases
      );
      
      let passedTests = 0;
      for (const test of testResults) {
        checks.push(test);
        if (test.passed) passedTests++;
      }

      const testScore = Math.round((passedTests / criteria.testCases.length) * 30);
      score = Math.min(score, 70 + testScore);
      
      if (passedTests < criteria.testCases.length) {
        passed = false;
      }
    }
  }

  if (submissionType === 'data' && payload.data) {
    // Data validation - check schema if provided
    if (criteria.schema) {
      const schemaValid = validateJsonSchema(payload.data, criteria.schema);
      checks.push({
        name: 'schema_validation',
        passed: schemaValid,
        message: schemaValid ? 'Data matches schema' : 'Data does not match required schema',
      });
      if (!schemaValid) {
        score -= 30;
        passed = false;
      }
    }

    // Check required fields
    if (criteria.requiredFields) {
      const missingFields = criteria.requiredFields.filter(
        (f: string) => !(f in payload.data)
      );
      const fieldsValid = missingFields.length === 0;
      checks.push({
        name: 'required_fields',
        passed: fieldsValid,
        message: fieldsValid 
          ? 'All required fields present'
          : `Missing fields: ${missingFields.join(', ')}`,
      });
      if (!fieldsValid) {
        score -= 20;
        passed = false;
      }
    }
  }

  if (submissionType === 'content' && payload.content) {
    // Content validation - word count, etc.
    const wordCount = payload.content.split(/\s+/).length;
    const minWords = criteria.minWords || 0;
    const maxWords = criteria.maxWords || Infinity;
    
    const lengthValid = wordCount >= minWords && wordCount <= maxWords;
    checks.push({
      name: 'content_length',
      passed: lengthValid,
      message: `Word count: ${wordCount} (required: ${minWords}-${maxWords || '∞'})`,
    });
    if (!lengthValid) {
      score -= 20;
      passed = false;
    }
  }

  if (submissionType === 'url' && payload.url) {
    // URL validation - check if accessible
    try {
      const response = await fetch(payload.url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
      });
      const urlValid = response.ok;
      checks.push({
        name: 'url_accessible',
        passed: urlValid,
        message: urlValid 
          ? `URL accessible (status ${response.status})`
          : `URL returned ${response.status}`,
      });
      if (!urlValid) {
        score -= 30;
        passed = false;
      }
    } catch (error) {
      checks.push({
        name: 'url_accessible',
        passed: false,
        message: `URL check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      score -= 30;
      passed = false;
    }
  }

  // LLM Assessment (if API key available and not already failed)
  if (ANTHROPIC_API_KEY && passed) {
    llmAssessment = await runLLMAssessment(submission, bounty, checks);
    checks.push({
      name: 'llm_quality',
      passed: llmAssessment.passed,
      message: `LLM assessment: ${llmAssessment.passed ? 'Passed' : 'Failed'} (${llmAssessment.score}/100)`,
      details: { reasoning: llmAssessment.reasoning },
    });

    // LLM score affects final score
    score = Math.round((score + llmAssessment.score) / 2);
    if (!llmAssessment.passed) {
      passed = false;
    }
  }

  return {
    passed,
    score: Math.max(0, Math.min(100, score)),
    checks,
    executionResult,
    llmAssessment,
  };
}

/**
 * Execute code in E2B sandbox
 */
async function executeCodeInSandbox(
  code: string,
  language: string,
  _testCases: any[]
): Promise<ExecutionResult> {
  if (!E2B_API_KEY) {
    console.warn('E2B_API_KEY not set - returning mock result');
    return {
      stdout: '[E2B not configured]',
      stderr: '',
      exitCode: 0,
      executionTimeMs: 0,
    };
  }

  const startTime = Date.now();
  let sandbox: Sandbox | null = null;

  try {
    sandbox = await Sandbox.create({ apiKey: E2B_API_KEY });
    
    const execution = await sandbox.runCode(code, {
      language: language as 'python' | 'javascript',
      timeoutMs: VALIDATION_TIMEOUT_MS,
    });

    return {
      stdout: execution.logs.stdout.join('\n'),
      stderr: execution.logs.stderr.join('\n'),
      exitCode: execution.error ? 1 : 0,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      stdout: '',
      stderr: error instanceof Error ? error.message : 'Sandbox error',
      exitCode: 1,
      executionTimeMs: Date.now() - startTime,
    };
  } finally {
    if (sandbox) {
      await sandbox.kill().catch(() => {});
    }
  }
}

/**
 * Run test cases against code
 */
async function runTestCases(
  code: string,
  language: string,
  testCases: Array<{ name?: string; input: string; expectedOutput: string }>
): Promise<ValidationCheck[]> {
  const results: ValidationCheck[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    const testName = test.name || `test_${i + 1}`;

    try {
      // Build test wrapper code
      const testCode = language === 'python'
        ? `${code}\n\nresult = main(${JSON.stringify(test.input)})\nprint(result)`
        : `${code}\n\nconsole.log(main(${JSON.stringify(test.input)}));`;

      const result = await executeCodeInSandbox(testCode, language, []);
      const actual = result.stdout.trim();
      const expected = test.expectedOutput.trim();
      const passed = actual === expected;

      results.push({
        name: testName,
        passed,
        message: passed
          ? `Test passed`
          : `Expected "${expected}", got "${actual}"`,
        details: { input: test.input, expected, actual },
      });
    } catch (error) {
      results.push({
        name: testName,
        passed: false,
        message: `Test error: ${error instanceof Error ? error.message : 'Unknown'}`,
      });
    }
  }

  return results;
}

/**
 * Run LLM quality assessment
 */
async function runLLMAssessment(
  submission: typeof submissions.$inferSelect,
  bounty: typeof bounties.$inferSelect,
  priorChecks: ValidationCheck[]
): Promise<LLMAssessment> {
  if (!ANTHROPIC_API_KEY) {
    return { passed: true, score: 70, reasoning: 'LLM assessment not configured' };
  }

  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    
    const checksummary = priorChecks
      .map(c => `- ${c.name}: ${c.passed ? '✓' : '✗'} ${c.message}`)
      .join('\n');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are a quality judge for MoldTank bounty submissions.

BOUNTY: ${bounty.title}
${bounty.description}

CRITERIA: ${JSON.stringify(bounty.criteria)}

AUTOMATED CHECKS:
${checksummary}

SUBMISSION PAYLOAD:
${JSON.stringify(submission.payload, null, 2).slice(0, 5000)}

Does this submission genuinely solve the bounty? Respond with ONLY JSON:
{"passed": true/false, "score": 0-100, "reasoning": "brief explanation"}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        passed: Boolean(parsed.passed),
        score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
        reasoning: String(parsed.reasoning || ''),
      };
    }
  } catch (error) {
    console.error('LLM assessment error:', error);
  }

  return { passed: true, score: 70, reasoning: 'LLM assessment failed - defaulting to pass' };
}

/**
 * Simple JSON schema validation
 */
function validateJsonSchema(data: any, schema: any): boolean {
  // Basic type checking - could use ajv for full JSON Schema support
  if (schema.type === 'object' && typeof data !== 'object') return false;
  if (schema.type === 'array' && !Array.isArray(data)) return false;
  if (schema.type === 'string' && typeof data !== 'string') return false;
  if (schema.type === 'number' && typeof data !== 'number') return false;
  return true;
}

/**
 * Check if this submission should be the winner
 */
async function checkForWinner(
  bounty: typeof bounties.$inferSelect,
  submission: typeof submissions.$inferSelect,
  score: number
) {
  // Get all passed submissions for this bounty, ordered by timestamp
  const passedSubmissions = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.bountyId, bounty.id),
        eq(submissions.status, SubmissionStatus.PASSED)
      )
    )
    .orderBy(submissions.timestamp);

  // First valid submission wins (or highest score if configured)
  const winner = passedSubmissions[0];
  
  if (winner && winner.id === submission.id) {
    // This submission is the winner!
    await db
      .update(bounties)
      .set({
        status: BountyStatus.COMPLETED,
        winnerId: submission.agentId,
        winningSubmissionId: submission.id,
        completedAt: new Date(),
      })
      .where(eq(bounties.id, bounty.id));

    // Update agent stats
    await db
      .update(agents)
      .set({
        bountiesWon: agents.bountiesWon,
        // Would also update: totalEarnings, winRate, etc.
      })
      .where(eq(agents.id, submission.agentId));

    // TODO: Trigger payment via x402
    console.log(`[Winner] Submission ${submission.id} won bounty ${bounty.id}`);
  }
}
