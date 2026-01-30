// ═══════════════════════════════════════════════════════════════════════════
// BOUNTIES ROUTES - List and Create
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gte, lte, desc, asc, sql, or, ilike } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import slugify from 'slugify';
import { db } from '@/lib/database';
import { bounties } from '@/db';
import { handleApiError, ApiError } from '@/lib/errors';
import { getAuth } from '@/lib/auth';
import {
  BountyStatus,
  EscrowStatus,
  PLATFORM_FEE_PERCENT,
  MIN_BOUNTY_AMOUNT,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  DEFAULT_PAGE_SIZE,
} from '@/types';

// GET /api/bounties - List bounties (public)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const status = searchParams.get('status') as any;
    const type = searchParams.get('type');
    const minAmount = searchParams.get('minAmount') ? Number(searchParams.get('minAmount')) : undefined;
    const maxAmount = searchParams.get('maxAmount') ? Number(searchParams.get('maxAmount')) : undefined;
    const sortBy = (searchParams.get('sortBy') || 'createdAt') as 'deadline' | 'amount' | 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || DEFAULT_PAGE_SIZE));
    const search = searchParams.get('search');

    // Build conditions
    const conditions = [];
    
    if (status) {
      conditions.push(eq(bounties.status, status));
    } else {
      conditions.push(
        or(
          eq(bounties.status, 'open'),
          eq(bounties.status, 'in_progress'),
          eq(bounties.status, 'completed')
        )
      );
    }
    
    if (type) {
      conditions.push(sql`${bounties.criteria}->>'type' = ${type}`);
    }
    
    if (minAmount !== undefined) {
      conditions.push(gte(bounties.amount, String(minAmount)));
    }
    
    if (maxAmount !== undefined) {
      conditions.push(lte(bounties.amount, String(maxAmount)));
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(bounties.title, `%${search}%`),
          ilike(bounties.description, `%${search}%`)
        )
      );
    }

    // Sorting
    const orderBy = sortBy === 'deadline' 
      ? (sortOrder === 'asc' ? asc(bounties.deadline) : desc(bounties.deadline))
      : sortBy === 'amount'
      ? (sortOrder === 'asc' ? asc(bounties.amount) : desc(bounties.amount))
      : (sortOrder === 'asc' ? asc(bounties.createdAt) : desc(bounties.createdAt));

    const offset = (page - 1) * limit;
    
    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(bounties)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(bounties)
        .where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      hasMore: offset + data.length < total,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/bounties - Create bounty (authenticated)
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    const data = await request.json();
    
    // Validate
    if (!data.title || data.title.length < 5 || data.title.length > MAX_TITLE_LENGTH) {
      throw new ApiError(400, 'Invalid title length', 'INVALID_TITLE');
    }
    if (!data.description || data.description.length < 20 || data.description.length > MAX_DESCRIPTION_LENGTH) {
      throw new ApiError(400, 'Invalid description length', 'INVALID_DESCRIPTION');
    }
    if (!data.amount || data.amount < MIN_BOUNTY_AMOUNT) {
      throw new ApiError(400, `Minimum bounty amount is ${MIN_BOUNTY_AMOUNT}`, 'INVALID_AMOUNT');
    }
    if (!data.deadline) {
      throw new ApiError(400, 'Deadline is required', 'MISSING_DEADLINE');
    }
    if (!data.criteria?.type) {
      throw new ApiError(400, 'Criteria type is required', 'MISSING_CRITERIA');
    }

    // Calculate fees
    const amount = data.amount;
    const platformFee = amount * (PLATFORM_FEE_PERCENT / 100);
    const winnerPayout = amount - platformFee;
    
    // Generate slug
    const baseSlug = slugify(data.title, { lower: true, strict: true });
    const slug = `${baseSlug}-${nanoid(6)}`;
    
    // Create bounty
    const [bounty] = await db
      .insert(bounties)
      .values({
        slug,
        posterId: auth.agentId || auth.walletAddress,
        posterWallet: auth.walletAddress,
        title: data.title,
        description: data.description,
        amount: String(amount),
        platformFee: String(platformFee),
        winnerPayout: String(winnerPayout),
        deadline: new Date(data.deadline),
        status: data.escrowTxHash ? BountyStatus.OPEN : BountyStatus.DRAFT,
        criteria: data.criteria,
        escrowTxHash: data.escrowTxHash,
        escrowStatus: data.escrowTxHash ? EscrowStatus.PENDING : EscrowStatus.PENDING,
        source: 'manual',
      })
      .returning();

    return NextResponse.json(bounty, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
