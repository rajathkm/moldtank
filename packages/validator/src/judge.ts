/**
 * LLM Judge
 * Uses Claude to assess submission quality beyond automated checks
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Bounty, Submission, ValidationResult, LLMAssessment } from './types';

export class LLMJudge {
  private client: Anthropic | null = null;
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  /**
   * Assess submission quality using Claude
   */
  async assess(
    submission: Submission,
    bounty: Bounty,
    priorResult: ValidationResult
  ): Promise<LLMAssessment> {
    if (!this.client) {
      return {
        passed: true,
        score: priorResult.score,
        reasoning: 'LLM judge not configured - skipping quality assessment',
      };
    }

    try {
      const prompt = this.buildPrompt(submission, bounty, priorResult);
      
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      return this.parseResponse(content.text);
    } catch (error) {
      console.error('LLM Judge error:', error);
      // On error, don't block - return passing with prior score
      return {
        passed: true,
        score: priorResult.score,
        reasoning: `LLM assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private buildPrompt(
    submission: Submission,
    bounty: Bounty,
    priorResult: ValidationResult
  ): string {
    const checksummary = priorResult.checks
      .map(c => `- ${c.name}: ${c.passed ? '✓' : '✗'} ${c.message || ''}`)
      .join('\n');

    // Truncate payload if too large
    let payloadStr = JSON.stringify(submission.payload, null, 2);
    if (payloadStr.length > 10000) {
      payloadStr = payloadStr.slice(0, 10000) + '\n... [truncated]';
    }

    return `You are a quality assurance judge for MoldTank, a bounty marketplace for AI agents.

BOUNTY DETAILS:
- Title: ${bounty.title}
- Type: ${bounty.type}
- Description: ${bounty.description}
- Criteria: ${JSON.stringify(bounty.criteria, null, 2)}

AUTOMATED VALIDATION RESULTS:
${checksummary}
Overall automated score: ${priorResult.score}/100

SUBMISSION PAYLOAD:
${payloadStr}

YOUR TASK:
Evaluate whether this submission truly meets the bounty requirements beyond what automated checks can verify.

Consider:
1. Does the submission actually solve the stated problem?
2. Is the quality acceptable (not just technically valid)?
3. Are there any obvious issues the automated checks missed?
4. Would a reasonable human accept this as a valid solution?

Respond with ONLY a JSON object in this exact format:
{
  "passed": true or false,
  "score": 0-100,
  "reasoning": "Brief explanation of your assessment"
}

Be fair but strict. Automated checks passing doesn't guarantee quality.`;
  }

  private parseResponse(text: string): LLMAssessment {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        passed: Boolean(parsed.passed),
        score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
        reasoning: String(parsed.reasoning || 'No reasoning provided'),
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', text);
      // Default to passing if we can't parse
      return {
        passed: true,
        score: 70,
        reasoning: 'Failed to parse LLM response - defaulting to pass',
      };
    }
  }
}
