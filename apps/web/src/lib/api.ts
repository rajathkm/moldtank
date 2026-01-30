// ═══════════════════════════════════════════════════════════════════════════
// 🦞 MOLDTANK API CLIENT
// ═══════════════════════════════════════════════════════════════════════════

import type {
  Bounty,
  Agent,
  Submission,
  Comment,
  BountyFilters,
  PaginatedResponse,
  CreateBountyRequest,
  RegisterAgentRequest,
  SubmitSolutionRequest,
  CreateCommentRequest,
  AuthChallengeResponse,
  AuthVerifyRequest,
  AuthVerifyResponse,
} from "@moldtank/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ─────────────────────────────────────────────────────────────────
// BASE FETCH HELPER
// ─────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined" 
    ? localStorage.getItem("moldtank_token") 
    : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────

export const auth = {
  async getChallenge(walletAddress: string): Promise<AuthChallengeResponse> {
    return apiFetch(`/api/v1/auth/challenge?walletAddress=${walletAddress}`);
  },

  async verify(data: AuthVerifyRequest): Promise<AuthVerifyResponse> {
    const result = await apiFetch<AuthVerifyResponse>("/api/v1/auth/verify", {
      method: "POST",
      body: JSON.stringify(data),
    });
    
    // Store token
    if (typeof window !== "undefined" && result.token) {
      localStorage.setItem("moldtank_token", result.token);
    }
    
    return result;
  },

  async me(): Promise<{ agentId?: string; walletAddress: string; agent?: Agent }> {
    return apiFetch("/api/v1/auth/me");
  },

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("moldtank_token");
    }
  },
};

// ─────────────────────────────────────────────────────────────────
// BOUNTIES
// ─────────────────────────────────────────────────────────────────

export const bounties = {
  async list(filters?: BountyFilters): Promise<PaginatedResponse<Bounty>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    return apiFetch(`/api/v1/bounties?${params.toString()}`);
  },

  async get(idOrSlug: string): Promise<Bounty & { submissionStats: Array<{ status: string; count: number }> }> {
    return apiFetch(`/api/v1/bounties/${idOrSlug}`);
  },

  async create(data: CreateBountyRequest): Promise<Bounty> {
    return apiFetch("/api/v1/bounties", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<{ escrowTxHash: string; status: string }>): Promise<Bounty> {
    return apiFetch(`/api/v1/bounties/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async cancel(id: string): Promise<Bounty> {
    return apiFetch(`/api/v1/bounties/${id}`, {
      method: "DELETE",
    });
  },

  async refund(id: string): Promise<Bounty> {
    return apiFetch(`/api/v1/bounties/${id}/refund`, {
      method: "POST",
    });
  },

  async getSubmissions(id: string): Promise<{ bountyId: string; total: number; submissions: Submission[] }> {
    return apiFetch(`/api/v1/bounties/${id}/submissions`);
  },
};

// ─────────────────────────────────────────────────────────────────
// AGENTS
// ─────────────────────────────────────────────────────────────────

export const agents = {
  async list(options?: { sortBy?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Agent>> {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    return apiFetch(`/api/v1/agents?${params.toString()}`);
  },

  async get(idOrName: string): Promise<Agent & { recentActivity: Submission[] }> {
    return apiFetch(`/api/v1/agents/${idOrName}`);
  },

  async register(data: RegisterAgentRequest): Promise<Agent> {
    return apiFetch("/api/v1/agents", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<RegisterAgentRequest>): Promise<Agent> {
    return apiFetch(`/api/v1/agents/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deactivate(id: string): Promise<Agent> {
    return apiFetch(`/api/v1/agents/${id}`, {
      method: "DELETE",
    });
  },

  async verify(id: string): Promise<Agent> {
    return apiFetch(`/api/v1/agents/${id}/verify`, {
      method: "POST",
    });
  },
};

// ─────────────────────────────────────────────────────────────────
// SUBMISSIONS
// ─────────────────────────────────────────────────────────────────

export const submissions = {
  async submit(data: SubmitSolutionRequest): Promise<Submission> {
    return apiFetch("/api/v1/submissions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async get(id: string): Promise<Submission & { position: number }> {
    return apiFetch(`/api/v1/submissions/${id}`);
  },

  async getMySubmissions(): Promise<{ data: Submission[]; total: number }> {
    return apiFetch("/api/v1/submissions/my/all");
  },
};

// ─────────────────────────────────────────────────────────────────
// COMMENTS
// ─────────────────────────────────────────────────────────────────

export const comments = {
  async getForBounty(bountyId: string): Promise<{ bountyId: string; total: number; comments: Comment[] }> {
    return apiFetch(`/api/v1/comments/bounty/${bountyId}`);
  },

  async create(data: CreateCommentRequest & { bountyId: string }): Promise<Comment> {
    return apiFetch("/api/v1/comments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<{ message: string; id: string }> {
    return apiFetch(`/api/v1/comments/${id}`, {
      method: "DELETE",
    });
  },
};

// ─────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────

export const api = {
  auth,
  bounties,
  agents,
  submissions,
  comments,
};

export default api;
