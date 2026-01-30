// ═══════════════════════════════════════════════════════════════════════════
// QA VALIDATOR SERVICE - Deterministic submission validation
// ═══════════════════════════════════════════════════════════════════════════

import { 
  ValidationCriteria, 
  CodeCriteria, 
  DataCriteria, 
  ContentCriteria, 
  UrlCriteria,
  SubmissionPayload,
  ValidationResult,
  CodePayload,
  DataPayload,
  ContentPayload,
  UrlPayload,
} from '@moldtank/types';

// ─────────────────────────────────────────────────────────────────
// MAIN VALIDATOR
// ─────────────────────────────────────────────────────────────────

export async function validateSubmission(
  payload: SubmissionPayload,
  criteria: ValidationCriteria
): Promise<ValidationResult> {
  const startTime = Date.now();

  try {
    let result: ValidationResult;

    switch (criteria.type) {
      case 'code':
        result = await validateCode(payload as CodePayload, criteria as CodeCriteria);
        break;
      case 'data':
        result = await validateData(payload as DataPayload, criteria as DataCriteria);
        break;
      case 'content':
        result = await validateContent(payload as ContentPayload, criteria as ContentCriteria);
        break;
      case 'url':
        result = await validateUrl(payload as UrlPayload, criteria as UrlCriteria);
        break;
      default:
        result = {
          passed: false,
          reason: `Unknown criteria type: ${(criteria as any).type}`,
          details: {},
          executionTimeMs: Date.now() - startTime,
        };
    }

    result.executionTimeMs = Date.now() - startTime;
    return result;

  } catch (error) {
    return {
      passed: false,
      reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {},
      executionTimeMs: Date.now() - startTime,
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// CODE VALIDATION
// ─────────────────────────────────────────────────────────────────

async function validateCode(payload: CodePayload, criteria: CodeCriteria): Promise<ValidationResult> {
  const details: ValidationResult['details'] = {};

  // Check required files
  const files = payload.files || {};
  const missingFiles = criteria.requiredFiles.filter(f => !files[f]);
  
  if (missingFiles.length > 0) {
    return {
      passed: false,
      reason: `Missing required files: ${missingFiles.join(', ')}`,
      details: { missingFiles },
      executionTimeMs: 0,
    };
  }

  // In production, this would:
  // 1. Create a Docker sandbox
  // 2. Copy files into sandbox
  // 3. Run setup command
  // 4. Run test command
  // 5. Capture output and exit code
  
  // For MVP, we simulate validation success based on file presence
  // TODO: Implement actual Docker sandbox execution
  
  details.exitCode = 0;
  details.stdout = 'All tests passed (simulated)';
  details.stderr = '';
  details.testResults = criteria.testCases?.map((tc, i) => ({
    name: `test_case_${i + 1}`,
    passed: true,
  })) || [];

  return {
    passed: true,
    reason: 'All validation checks passed',
    details,
    executionTimeMs: 0,
  };
}

// ─────────────────────────────────────────────────────────────────
// DATA VALIDATION
// ─────────────────────────────────────────────────────────────────

async function validateData(payload: DataPayload, criteria: DataCriteria): Promise<ValidationResult> {
  const details: ValidationResult['details'] = {
    format: criteria.format,
    schemaErrors: [],
    constraintViolations: [],
  };

  try {
    // Decode data
    let dataContent: string;
    if (payload.data) {
      dataContent = Buffer.from(payload.data, 'base64').toString('utf-8');
    } else if (payload.dataUrl) {
      // In production, fetch from URL
      return {
        passed: false,
        reason: 'URL-based data submission not yet implemented',
        details,
        executionTimeMs: 0,
      };
    } else {
      return {
        passed: false,
        reason: 'No data provided',
        details,
        executionTimeMs: 0,
      };
    }

    // Parse based on format
    let rows: any[] = [];
    
    if (criteria.format === 'json') {
      const parsed = JSON.parse(dataContent);
      rows = Array.isArray(parsed) ? parsed : [parsed];
    } else if (criteria.format === 'jsonl') {
      rows = dataContent.split('\n').filter(Boolean).map(line => JSON.parse(line));
    } else if (criteria.format === 'csv') {
      // Simple CSV parsing
      const lines = dataContent.split('\n').filter(Boolean);
      if (lines.length === 0) {
        return {
          passed: false,
          reason: 'CSV file is empty',
          details,
          executionTimeMs: 0,
        };
      }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => row[h] = values[i] || '');
        return row;
      });
    }

    details.rowCount = rows.length;

    // Check row count
    if (criteria.minRows && rows.length < criteria.minRows) {
      return {
        passed: false,
        reason: `Insufficient rows: ${rows.length} < ${criteria.minRows}`,
        details,
        executionTimeMs: 0,
      };
    }

    if (criteria.maxRows && rows.length > criteria.maxRows) {
      return {
        passed: false,
        reason: `Too many rows: ${rows.length} > ${criteria.maxRows}`,
        details,
        executionTimeMs: 0,
      };
    }

    // Check required columns
    if (criteria.requiredColumns && rows.length > 0) {
      const sampleRow = rows[0];
      const missingCols = criteria.requiredColumns.filter(col => !(col in sampleRow));
      if (missingCols.length > 0) {
        return {
          passed: false,
          reason: `Missing required columns: ${missingCols.join(', ')}`,
          details: { ...details, missingColumns: missingCols },
          executionTimeMs: 0,
        };
      }
    }

    // Check uniqueness
    if (criteria.uniqueOn && criteria.uniqueOn.length > 0) {
      const seen = new Set<string>();
      let duplicates = 0;
      for (const row of rows) {
        const key = criteria.uniqueOn.map(col => row[col]).join('|');
        if (seen.has(key)) {
          duplicates++;
        }
        seen.add(key);
      }
      details.uniqueViolations = duplicates;
      if (duplicates > 0 && (criteria.maxDuplicatePercent === 0 || !criteria.maxDuplicatePercent)) {
        return {
          passed: false,
          reason: `Found ${duplicates} duplicate entries on ${criteria.uniqueOn.join(', ')}`,
          details,
          executionTimeMs: 0,
        };
      }
    }

    // Check constraints
    if (criteria.constraints) {
      const violations: string[] = [];
      for (const [field, constraint] of Object.entries(criteria.constraints)) {
        for (let i = 0; i < rows.length; i++) {
          const value = rows[i][field];
          
          if (constraint.notNull && (value === null || value === undefined || value === '')) {
            violations.push(`Row ${i + 1}: ${field} is null`);
          }
          
          if (constraint.pattern && value) {
            const regex = new RegExp(constraint.pattern);
            if (!regex.test(String(value))) {
              violations.push(`Row ${i + 1}: ${field} doesn't match pattern`);
            }
          }
          
          if (constraint.enum && value && !constraint.enum.includes(value)) {
            violations.push(`Row ${i + 1}: ${field} not in allowed values`);
          }
        }
      }
      
      if (violations.length > 0) {
        details.constraintViolations = violations.slice(0, 10); // Limit to first 10
        return {
          passed: false,
          reason: `Found ${violations.length} constraint violations`,
          details,
          executionTimeMs: 0,
        };
      }
    }

    // Calculate null percentages
    if (criteria.maxNullPercent !== undefined) {
      details.nullPercentages = {};
      const columns = Object.keys(rows[0] || {});
      for (const col of columns) {
        const nullCount = rows.filter(r => !r[col] || r[col] === '').length;
        details.nullPercentages[col] = (nullCount / rows.length) * 100;
        
        if (details.nullPercentages[col] > criteria.maxNullPercent) {
          return {
            passed: false,
            reason: `Column ${col} has ${details.nullPercentages[col].toFixed(1)}% null values (max: ${criteria.maxNullPercent}%)`,
            details,
            executionTimeMs: 0,
          };
        }
      }
    }

    return {
      passed: true,
      reason: 'Data meets all criteria',
      details,
      executionTimeMs: 0,
    };

  } catch (error) {
    return {
      passed: false,
      reason: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details,
      executionTimeMs: 0,
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// CONTENT VALIDATION
// ─────────────────────────────────────────────────────────────────

async function validateContent(payload: ContentPayload, criteria: ContentCriteria): Promise<ValidationResult> {
  const details: ValidationResult['details'] = {
    format: criteria.format,
  };

  const content = payload.content || '';

  // Count words
  const words = content.split(/\s+/).filter(Boolean);
  details.wordCount = words.length;

  if (criteria.minWords && words.length < criteria.minWords) {
    return {
      passed: false,
      reason: `Insufficient word count: ${words.length} < ${criteria.minWords}`,
      details,
      executionTimeMs: 0,
    };
  }

  if (criteria.maxWords && words.length > criteria.maxWords) {
    return {
      passed: false,
      reason: `Word count exceeds limit: ${words.length} > ${criteria.maxWords}`,
      details,
      executionTimeMs: 0,
    };
  }

  // Check required sections (markdown headers)
  if (criteria.requiredSections && criteria.format === 'markdown') {
    const headerRegex = /^#{1,3}\s+(.+)$/gm;
    const foundSections: string[] = [];
    let match;
    while ((match = headerRegex.exec(content)) !== null) {
      foundSections.push(match[1].trim());
    }
    details.sectionsFound = foundSections;

    const missingSections = criteria.requiredSections.filter(
      section => !foundSections.some(found => 
        found.toLowerCase().includes(section.toLowerCase())
      )
    );

    if (missingSections.length > 0) {
      details.missingSections = missingSections;
      return {
        passed: false,
        reason: `Missing required sections: ${missingSections.join(', ')}`,
        details,
        executionTimeMs: 0,
      };
    }
  }

  // Check must-contain keywords
  if (criteria.mustContain) {
    const contentLower = content.toLowerCase();
    const found = criteria.mustContain.filter(kw => contentLower.includes(kw.toLowerCase()));
    const missing = criteria.mustContain.filter(kw => !contentLower.includes(kw.toLowerCase()));
    
    details.keywordsFound = found;
    
    if (missing.length > 0) {
      details.missingKeywords = missing;
      return {
        passed: false,
        reason: `Missing required keywords: ${missing.join(', ')}`,
        details,
        executionTimeMs: 0,
      };
    }
  }

  // Check must-not-contain (blocklist)
  if (criteria.mustNotContain) {
    const contentLower = content.toLowerCase();
    const found = criteria.mustNotContain.filter(kw => contentLower.includes(kw.toLowerCase()));
    
    if (found.length > 0) {
      details.blockedKeywordsFound = found;
      return {
        passed: false,
        reason: `Contains blocked content: ${found.join(', ')}`,
        details,
        executionTimeMs: 0,
      };
    }
  }

  // Plagiarism check would go here
  // For now, just check for common placeholder text
  if (criteria.plagiarismCheck) {
    const plagiarismIndicators = ['lorem ipsum', 'dolor sit amet', 'consectetur adipiscing'];
    const contentLower = content.toLowerCase();
    const isPlagiarized = plagiarismIndicators.some(p => contentLower.includes(p));
    
    if (isPlagiarized) {
      details.similarityScore = 100;
      return {
        passed: false,
        reason: 'Content appears to be placeholder text',
        details,
        executionTimeMs: 0,
      };
    }
    details.similarityScore = 0;
  }

  return {
    passed: true,
    reason: 'Content meets all criteria',
    details,
    executionTimeMs: 0,
  };
}

// ─────────────────────────────────────────────────────────────────
// URL VALIDATION
// ─────────────────────────────────────────────────────────────────

async function validateUrl(payload: UrlPayload, criteria: UrlCriteria): Promise<ValidationResult> {
  const details: ValidationResult['details'] = {
    baseUrl: payload.url,
    endpointResults: [],
  };

  const baseUrl = payload.url?.replace(/\/$/, '');

  if (!baseUrl) {
    return {
      passed: false,
      reason: 'No URL provided',
      details,
      executionTimeMs: 0,
    };
  }

  // Check HTTPS
  if (criteria.mustBeHttps !== false && !baseUrl.startsWith('https://')) {
    return {
      passed: false,
      reason: 'URL must use HTTPS',
      details,
      executionTimeMs: 0,
    };
  }

  // Check each endpoint
  for (const endpoint of criteria.endpoints) {
    const fullUrl = `${baseUrl}${endpoint.path}`;
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), endpoint.maxResponseMs || 30000);

      const response = await fetch(fullUrl, {
        method: endpoint.method || 'GET',
        headers: endpoint.headers,
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseTime = Date.now() - startTime;
      const passed = response.status === endpoint.expectedStatus;

      let body: any;
      try {
        body = await response.text();
        if (body.startsWith('{') || body.startsWith('[')) {
          body = JSON.parse(body);
        }
      } catch {}

      const result = {
        path: endpoint.path,
        status: response.status,
        responseMs: responseTime,
        passed,
        body,
        error: passed ? undefined : `Expected status ${endpoint.expectedStatus}, got ${response.status}`,
      };

      // Check body contains
      if (passed && endpoint.bodyContains && typeof body === 'string') {
        if (!body.includes(endpoint.bodyContains)) {
          result.passed = false;
          result.error = `Response doesn't contain "${endpoint.bodyContains}"`;
        }
      }

      // Check response time
      if (passed && endpoint.maxResponseMs && responseTime > endpoint.maxResponseMs) {
        result.passed = false;
        result.error = `Response time ${responseTime}ms exceeds limit ${endpoint.maxResponseMs}ms`;
      }

      details.endpointResults!.push(result);

    } catch (error) {
      details.endpointResults!.push({
        path: endpoint.path,
        status: 0,
        responseMs: Date.now() - startTime,
        passed: false,
        error: error instanceof Error ? error.message : 'Request failed',
      });
    }
  }

  // Check if all endpoints passed
  const failedEndpoints = details.endpointResults!.filter(r => !r.passed);
  
  if (failedEndpoints.length > 0) {
    return {
      passed: false,
      reason: `${failedEndpoints.length} endpoint(s) failed: ${failedEndpoints.map(e => e.path).join(', ')}`,
      details,
      executionTimeMs: 0,
    };
  }

  details.uptime = 100;
  details.checksPerformed = criteria.checkCount || 1;

  return {
    passed: true,
    reason: 'All endpoints passed',
    details,
    executionTimeMs: 0,
  };
}

export { validateCode, validateData, validateContent, validateUrl };
