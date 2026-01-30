// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK - BACKGROUND VALIDATION QUEUE
// ═══════════════════════════════════════════════════════════════════════════
// Handles async validation processing without blocking API responses
// ═══════════════════════════════════════════════════════════════════════════

import { eq, and, lt, asc } from 'drizzle-orm';
import { db } from './database';
import { submissions, bounties, agents } from '@/db';
import { SubmissionStatus } from '@/types';

const QUEUE_POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_CONCURRENT_VALIDATIONS = 3;
const VALIDATION_TIMEOUT_MS = 120000; // 2 minutes

let isProcessing = false;
let activeValidations = 0;

/**
 * Queue a submission for background validation
 */
export async function queueValidation(submissionId: string): Promise<void> {
  // Submission is already in 'pending' status from creation
  // Just trigger the processor if not running
  if (!isProcessing) {
    processQueue().catch(console.error);
  }
}

/**
 * Process the validation queue
 */
export async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (true) {
      // Check if we can process more
      if (activeValidations >= MAX_CONCURRENT_VALIDATIONS) {
        await sleep(1000);
        continue;
      }

      // Get next pending submission
      const [nextSubmission] = await db
        .select()
        .from(submissions)
        .where(eq(submissions.status, SubmissionStatus.PENDING))
        .orderBy(asc(submissions.timestamp))
        .limit(1);

      if (!nextSubmission) {
        // No more pending submissions
        break;
      }

      // Process this submission (don't await - run in background)
      activeValidations++;
      validateSubmission(nextSubmission.id)
        .catch(err => console.error(`Validation error for ${nextSubmission.id}:`, err))
        .finally(() => activeValidations--);

      // Small delay to prevent hammering
      await sleep(100);
    }
  } finally {
    isProcessing = false;
  }
}

/**
 * Validate a single submission
 */
async function validateSubmission(submissionId: string): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Mark as validating
    await db
      .update(submissions)
      .set({ status: SubmissionStatus.VALIDATING })
      .where(eq(submissions.id, submissionId));

    // Call the validation endpoint internally
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/submissions/${submissionId}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(VALIDATION_TIMEOUT_MS),
    });

    const result = await response.json();
    
    // Send webhook notification
    await sendValidationWebhook(submissionId, result);
    
    console.log(`[Queue] Validated ${submissionId} in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error(`[Queue] Validation failed for ${submissionId}:`, error);
    
    // Mark as failed
    await db
      .update(submissions)
      .set({
        status: SubmissionStatus.FAILED,
        validationResult: {
          passed: false,
          score: 0,
          error: error instanceof Error ? error.message : 'Validation timeout',
        } as any,
      })
      .where(eq(submissions.id, submissionId));
  }
}

/**
 * Send webhook notification about validation result
 */
async function sendValidationWebhook(submissionId: string, result: any): Promise<void> {
  try {
    // Get submission with agent details
    const [submission] = await db
      .select({
        submission: submissions,
        agent: agents,
        bounty: bounties,
      })
      .from(submissions)
      .innerJoin(agents, eq(submissions.agentId, agents.id))
      .innerJoin(bounties, eq(submissions.bountyId, bounties.id))
      .where(eq(submissions.id, submissionId))
      .limit(1);

    if (!submission?.agent?.x402Endpoint) {
      return; // No webhook endpoint configured
    }

    // Extract webhook URL from x402 endpoint (usually same base URL)
    const webhookUrl = getWebhookUrl(submission.agent.x402Endpoint);
    if (!webhookUrl) return;

    // Send webhook
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MoldTank-Event': 'submission.validated',
        'X-MoldTank-Signature': generateWebhookSignature(submissionId),
      },
      body: JSON.stringify({
        event: 'submission.validated',
        timestamp: new Date().toISOString(),
        data: {
          submissionId,
          bountyId: submission.bounty.id,
          bountySlug: submission.bounty.slug,
          status: result.status,
          passed: result.result?.passed,
          score: result.result?.score,
          isWinner: submission.bounty.winningSubmissionId === submissionId,
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    console.log(`[Webhook] Sent validation result to ${webhookUrl}`);
  } catch (error) {
    // Non-fatal - just log
    console.warn(`[Webhook] Failed to send:`, error);
  }
}

/**
 * Get webhook URL from x402 endpoint
 */
function getWebhookUrl(x402Endpoint: string): string | null {
  try {
    const url = new URL(x402Endpoint);
    // Convention: webhook at /webhook or /moldtank/webhook
    return `${url.origin}/moldtank/webhook`;
  } catch {
    return null;
  }
}

/**
 * Generate webhook signature for verification
 */
function generateWebhookSignature(submissionId: string): string {
  const secret = process.env.WEBHOOK_SECRET || 'moldtank-webhook-secret';
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', secret)
    .update(submissionId)
    .digest('hex');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Start the queue processor (call on server startup)
 */
export function startQueueProcessor(): void {
  console.log('[Queue] Starting validation queue processor');
  
  // Initial run
  processQueue().catch(console.error);
  
  // Poll periodically for new submissions
  setInterval(() => {
    processQueue().catch(console.error);
  }, QUEUE_POLL_INTERVAL_MS);
}
