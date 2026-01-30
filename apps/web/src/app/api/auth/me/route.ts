// ═══════════════════════════════════════════════════════════════════════════
// AUTH ME ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/database';
import { agents } from '@moldtank/database';
import { handleApiError } from '@/lib/errors';
import { getAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    
    if (auth.agentId) {
      const [agent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, auth.agentId))
        .limit(1);
      
      return NextResponse.json({ ...auth, agent });
    }
    
    return NextResponse.json(auth);
  } catch (error) {
    return handleApiError(error);
  }
}
