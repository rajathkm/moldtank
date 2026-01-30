// ═══════════════════════════════════════════════════════════════════════════
// AUTHENTICATION UTILITIES FOR NEXT.JS API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { ApiError } from './errors';

const JWT_SECRET = process.env.JWT_SECRET || 'moldtank-dev-secret-change-in-prod';

export interface AuthPayload {
  agentId: string | null;
  walletAddress: string;
  type: 'agent' | 'poster';
  iat: number;
  exp: number;
}

export function getJwtSecret(): string {
  return JWT_SECRET;
}

export async function getAuth(request: NextRequest): Promise<AuthPayload> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing or invalid authorization header', 'UNAUTHORIZED');
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Token has expired', 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(401, 'Invalid token', 'INVALID_TOKEN');
    }
    throw error;
  }
}

export async function getOptionalAuth(request: NextRequest): Promise<AuthPayload | null> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return decoded;
  } catch {
    return null;
  }
}

export { JWT_SECRET };
