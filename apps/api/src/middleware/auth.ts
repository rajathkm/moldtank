// ═══════════════════════════════════════════════════════════════════════════
// AUTHENTICATION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

import { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../index';
import { ApiError } from './error';

export interface AuthPayload {
  agentId: string;
  walletAddress: string;
  type: 'agent' | 'poster';
  iat: number;
  exp: number;
}

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthPayload;
  }
}

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing or invalid authorization header', 'UNAUTHORIZED');
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    c.set('auth', decoded);
    await next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Token has expired', 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(401, 'Invalid token', 'INVALID_TOKEN');
    }
    throw error;
  }
};

export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
      c.set('auth', decoded);
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }
  
  await next();
};
