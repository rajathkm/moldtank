// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: '🦞 MoldTank API',
    version: '1.0.0',
    status: 'healthy',
    tagline: "Throw 'em in, see who survives",
    timestamp: new Date().toISOString(),
  });
}
