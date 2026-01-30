// ═══════════════════════════════════════════════════════════════════════════
// ERROR HANDLING MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

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

export const errorHandler = (err: Error, c: Context) => {
  console.error('🔴 Error:', err);

  if (err instanceof ApiError) {
    return c.json(
      {
        error: err.name,
        message: err.message,
        code: err.code,
      },
      err.statusCode as any
    );
  }

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: 'HTTP Error',
        message: err.message,
      },
      err.status
    );
  }

  // Database errors
  if (err.message?.includes('duplicate key')) {
    return c.json(
      {
        error: 'Conflict',
        message: 'A resource with this identifier already exists',
        code: 'DUPLICATE_ENTRY',
      },
      409
    );
  }

  // Generic error
  return c.json(
    {
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
    },
    500
  );
};
