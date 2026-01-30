// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK - CONTENT VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════
// Validates content submissions (text, articles, etc.)
// ═══════════════════════════════════════════════════════════════════════════

import type { Submission, Bounty, BountyCriteria } from '@moldtank/database';
import type {
  Validator,
  ValidationResult,
  ValidationCheck,
  ValidationContext,
  ContentPayload,
} from '../types';
import { createLLMJudge } from '../judge';

const VALIDATOR_VERSION = '1.0.0';

/**
 * Content validator for text-based submissions
 * 
 * Validates content submissions by:
 * 1. Checking content exists
 * 2. Word count validation
 * 3. Structure checks (paragraphs, sections)
 * 4. LLM quality assessment (usually required for content)
 */
export class ContentValidator implements Validator {
  readonly type = 'content' as const;

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
      const payload = submission.payload as unknown as ContentPayload;
      const criteria = bounty.criteria as BountyCriteria;

      // Check 1: Content exists
      if (!payload.content || typeof payload.content !== 'string') {
        checks.push({
          name: 'content_exists',
          passed: false,
          message: 'No content provided in submission',
        });
        return this.buildResult(false, 0, checks, startTime);
      }

      const content = payload.content.trim();
      if (content.length === 0) {
        checks.push({
          name: 'content_not_empty',
          passed: false,
          message: 'Content is empty',
        });
        return this.buildResult(false, 0, checks, startTime);
      }

      checks.push({
        name: 'content_exists',
        passed: true,
        message: 'Content submission found',
        details: { characterCount: content.length },
      });

      // Check 2: Word count
      const wordCount = this.countWords(content);
      const minWords = criteria.minWords || 0;
      const maxWords = criteria.maxWords || Infinity;

      if (wordCount < minWords) {
        checks.push({
          name: 'min_word_count',
          passed: false,
          message: `Minimum ${minWords} words required, got ${wordCount}`,
          details: { required: minWords, actual: wordCount },
        });
        overallPassed = false;
        score -= 25;
      } else if (wordCount > maxWords) {
        checks.push({
          name: 'max_word_count',
          passed: false,
          message: `Maximum ${maxWords} words allowed, got ${wordCount}`,
          details: { maximum: maxWords, actual: wordCount },
        });
        overallPassed = false;
        score -= 15; // Less severe penalty for being too long
      } else {
        checks.push({
          name: 'word_count',
          passed: true,
          message: `Word count within range (${wordCount} words)`,
          details: { wordCount, minWords, maxWords },
        });
      }

      // Check 3: Structure analysis
      const structureChecks = this.analyzeStructure(content, criteria.format);
      checks.push(...structureChecks);

      const failedStructureChecks = structureChecks.filter(c => !c.passed).length;
      if (failedStructureChecks > 0) {
        score -= failedStructureChecks * 10;
      }

      // Check 4: Basic quality checks
      const qualityChecks = this.checkBasicQuality(content);
      checks.push(...qualityChecks);

      const failedQualityChecks = qualityChecks.filter(c => !c.passed).length;
      if (failedQualityChecks > 0) {
        score -= failedQualityChecks * 5;
      }

      // Check 5: LLM quality assessment (usually important for content)
      let llmAssessment;
      // Default to running LLM assessment for content unless explicitly disabled
      if (context?.runLLMAssessment !== false) {
        const judge = createLLMJudge();
        llmAssessment = await judge.assessContent(
          content,
          bounty.description,
          criteria.customPrompt
        );

        checks.push({
          name: 'llm_quality',
          passed: llmAssessment.passed,
          message: `LLM assessment: ${llmAssessment.passed ? 'Passed' : 'Failed'} (${llmAssessment.score}/100)`,
          details: { 
            reasoning: llmAssessment.reasoning,
            feedback: llmAssessment.feedback,
          },
        });

        // LLM assessment is weighted more heavily for content
        score = Math.round((score * 0.3) + (llmAssessment.score * 0.7));
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
   * Count words in content
   */
  private countWords(content: string): number {
    return content
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;
  }

  /**
   * Analyze content structure
   */
  private analyzeStructure(
    content: string,
    format?: string
  ): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Check for paragraphs
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
    checks.push({
      name: 'has_paragraphs',
      passed: paragraphs.length > 1,
      message: paragraphs.length > 1
        ? `Content has ${paragraphs.length} paragraphs`
        : 'Content should have multiple paragraphs',
      details: { paragraphCount: paragraphs.length },
    });

    // Check for markdown structure if format is markdown
    if (format === 'markdown') {
      const hasHeadings = /^#{1,6}\s+.+/m.test(content);
      checks.push({
        name: 'has_headings',
        passed: hasHeadings,
        message: hasHeadings
          ? 'Content includes markdown headings'
          : 'Markdown content should include headings',
      });

      const hasList = /^[-*+]\s+.+|^\d+\.\s+.+/m.test(content);
      if (hasList) {
        checks.push({
          name: 'has_lists',
          passed: true,
          message: 'Content includes lists',
        });
      }
    }

    return checks;
  }

  /**
   * Check basic content quality
   */
  private checkBasicQuality(content: string): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Check for excessive repetition
    const words = content.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      if (word.length > 3) { // Ignore short words
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    const totalLongWords = Array.from(wordCounts.values()).reduce((a, b) => a + b, 0);
    const maxRepetition = Math.max(...wordCounts.values());
    const repetitionRatio = maxRepetition / totalLongWords;

    checks.push({
      name: 'no_excessive_repetition',
      passed: repetitionRatio < 0.1,
      message: repetitionRatio < 0.1
        ? 'Content has good word variety'
        : 'Content has excessive word repetition',
      details: { repetitionRatio: Math.round(repetitionRatio * 100) + '%' },
    });

    // Check for reasonable sentence length
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = words.length / sentences.length;

    checks.push({
      name: 'reasonable_sentences',
      passed: avgSentenceLength >= 5 && avgSentenceLength <= 40,
      message: avgSentenceLength >= 5 && avgSentenceLength <= 40
        ? `Average sentence length is reasonable (${Math.round(avgSentenceLength)} words)`
        : `Average sentence length may be problematic (${Math.round(avgSentenceLength)} words)`,
      details: { avgSentenceLength: Math.round(avgSentenceLength) },
    });

    // Check for gibberish (very basic)
    const longWords = words.filter(w => w.length > 15);
    const longWordRatio = longWords.length / words.length;

    checks.push({
      name: 'not_gibberish',
      passed: longWordRatio < 0.05,
      message: longWordRatio < 0.05
        ? 'Content appears to be legitimate text'
        : 'Content may contain gibberish or filler',
      details: { longWordRatio: Math.round(longWordRatio * 100) + '%' },
    });

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
 * Create a content validator instance
 */
export function createContentValidator(): Validator {
  return new ContentValidator();
}
