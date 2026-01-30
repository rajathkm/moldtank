// ═══════════════════════════════════════════════════════════════════════════
// ERROR HANDLING FOR NEXT.JS API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error('🔴 Error:', error);

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.name,
        message: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    // Database errors
    if (error.message?.includes('duplicate key')) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: 'A resource with this identifier already exists',
          code: 'DUPLICATE_ENTRY',
        },
        { status: 409 }
      );
    }
  }

  // Generic error
  return NextResponse.json(
    {
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
}
