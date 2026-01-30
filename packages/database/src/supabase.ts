// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK - SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════════
// Alternative database client using Supabase for hosted PostgreSQL
// ═══════════════════════════════════════════════════════════════════════════

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let supabaseClient: SupabaseClient<Database> | null = null;
let supabaseServiceClient: SupabaseClient<Database> | null = null;

/**
 * Get Supabase client for client-side operations (respects RLS)
 * Uses the anon key - safe to expose in browser
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    }

    supabaseClient = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

/**
 * Get Supabase client for server-side operations (bypasses RLS)
 * Uses the service key - NEVER expose in browser
 */
export function getSupabaseService(): SupabaseClient<Database> {
  if (!supabaseServiceClient) {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !serviceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    }

    supabaseServiceClient = createClient<Database>(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseServiceClient;
}

/**
 * Create a new Supabase client with custom configuration
 */
export function createSupabaseClient(
  url: string,
  key: string,
  options?: { serviceRole?: boolean }
): SupabaseClient<Database> {
  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    ...(options?.serviceRole && {
      global: {
        headers: {
          'x-supabase-service-role': 'true',
        },
      },
    }),
  });
}

// Re-export Supabase types
export type { SupabaseClient } from '@supabase/supabase-js';
