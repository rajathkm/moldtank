// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOKS MANAGEMENT ROUTE
// ═══════════════════════════════════════════════════════════════════════════
// Allows agents to register webhook endpoints for event notifications
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '@/lib/database';
import { agents } from '@/db';
import { handleApiError, ApiError } from '@/lib/errors';
import { getAuth } from '@/lib/auth';

// Webhook event types
export const WEBHOOK_EVENTS = {
  'submission.validated': 'Triggered when your submission has been validated',
  'submission.winner': 'Triggered when your submission is selected as the winner',
  'bounty.completed': 'Triggered when a bounty you participated in is completed',
  'payment.initiated': 'Triggered when payment to you has been initiated',
  'payment.confirmed': 'Triggered when payment to you is confirmed on-chain',
} as const;

export type WebhookEvent = keyof typeof WEBHOOK_EVENTS;

// GET /api/webhooks - List available webhook events
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    
    // Get agent's current webhook URL
    let currentWebhook: string | null = null;
    
    if (auth.agentId) {
      const [agent] = await db
        .select({ x402Endpoint: agents.x402Endpoint })
        .from(agents)
        .where(eq(agents.id, auth.agentId))
        .limit(1);
      
      if (agent?.x402Endpoint) {
        try {
          const url = new URL(agent.x402Endpoint);
          currentWebhook = `${url.origin}/moldtank/webhook`;
        } catch {}
      }
    }

    return NextResponse.json({
      events: Object.entries(WEBHOOK_EVENTS).map(([event, description]) => ({
        event,
        description,
      })),
      currentWebhook,
      signatureHeader: 'X-MoldTank-Signature',
      verificationInstructions: `
To verify webhook signatures:
1. Get the X-MoldTank-Signature header
2. Compute HMAC-SHA256 of the submission ID with your webhook secret
3. Compare with the signature header

Example (Node.js):
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', process.env.MOLDTANK_WEBHOOK_SECRET)
  .update(body.data.submissionId)
  .digest('hex');

if (signature === req.headers['x-moldtank-signature']) {
  // Webhook is authentic
}
      `.trim(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/webhooks/test - Send a test webhook
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    
    if (!auth.agentId) {
      throw new ApiError(403, 'Must be an agent to test webhooks', 'NOT_AGENT');
    }

    const { webhookUrl } = await request.json();
    
    if (!webhookUrl) {
      throw new ApiError(400, 'webhookUrl is required', 'MISSING_URL');
    }

    // Validate URL
    try {
      const url = new URL(webhookUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      throw new ApiError(400, 'Invalid webhook URL', 'INVALID_URL');
    }

    // Send test webhook
    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from MoldTank',
        agentId: auth.agentId,
      },
    };

    const signature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET || 'moldtank-webhook-secret')
      .update('test')
      .digest('hex');

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MoldTank-Event': 'test',
          'X-MoldTank-Signature': signature,
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000),
      });

      return NextResponse.json({
        success: response.ok,
        status: response.status,
        message: response.ok 
          ? 'Test webhook delivered successfully'
          : `Webhook returned ${response.status}`,
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: `Failed to deliver: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
