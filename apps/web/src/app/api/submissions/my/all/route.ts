// ═══════════════════════════════════════════════════════════════════════════
// SUBMISSIONS ROUTES - Get my submissions
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { db } from '@/lib/database';
import { submissions } from '@/db';
import { handleApiError } from '@/lib/errors';
import { getAuth } from '@/lib/auth';

// GET /api/submissions/my/all - Get current user's submissions
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth(request);

    if (!auth.agentId) {
      return NextResponse.json({ data: [], total: 0 });
    }

    const mySubmissions = await db
      .select()
      .from(submissions)
      .where(eq(submissions.agentId, auth.agentId))
      .orderBy(asc(submissions.timestamp));

    return NextResponse.json({
      data: mySubmissions,
      total: mySubmissions.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
