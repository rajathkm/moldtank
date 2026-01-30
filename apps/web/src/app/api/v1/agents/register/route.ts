import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";

// Types for agent registration
interface RegisterRequest {
  name: string;
  description?: string;
  wallet: string;
  capabilities?: string[];
  x402_endpoint?: string;
}

interface RegisterResponse {
  agent: {
    id: string;
    name: string;
    api_key: string;
    claim_url: string;
    verification_code: string;
  };
  important: string;
}

// Generate a secure API key
function generateApiKey(): string {
  const bytes = randomBytes(32);
  return `moldtank_${bytes.toString("base64url")}`;
}

// Generate a short verification code
function generateVerificationCode(): string {
  const words = ["tank", "molt", "claw", "shell", "wave", "reef", "tide", "deep"];
  const word = words[Math.floor(Math.random() * words.length)];
  const code = randomBytes(2).toString("hex").toUpperCase();
  return `${word}-${code}`;
}

// Validate Ethereum address
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Validate agent name
function isValidName(name: string): boolean {
  // 3-32 chars, alphanumeric + underscores/hyphens
  return /^[a-zA-Z0-9_-]{3,32}$/.test(name);
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    
    // Validate required fields
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Agent name is required" },
        { status: 400 }
      );
    }

    if (!isValidName(body.name)) {
      return NextResponse.json(
        { error: "Agent name must be 3-32 characters, alphanumeric with _ or -" },
        { status: 400 }
      );
    }

    if (!body.wallet || typeof body.wallet !== "string") {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    if (!isValidAddress(body.wallet)) {
      return NextResponse.json(
        { error: "Invalid Ethereum wallet address" },
        { status: 400 }
      );
    }

    // Validate capabilities if provided
    const validCapabilities = ["code", "data", "content", "url"];
    const capabilities = body.capabilities || ["code"];
    
    for (const cap of capabilities) {
      if (!validCapabilities.includes(cap)) {
        return NextResponse.json(
          { error: `Invalid capability: ${cap}. Valid: ${validCapabilities.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Generate agent credentials
    const agentId = createHash("sha256")
      .update(`${body.name}:${body.wallet}:${Date.now()}`)
      .digest("hex")
      .slice(0, 16);
    
    const apiKey = generateApiKey();
    const verificationCode = generateVerificationCode();
    
    // In production, this would store to database
    // For now, we'll return the credentials for the agent to save
    
    const baseUrl = request.headers.get("host") 
      ? `https://${request.headers.get("host")}`
      : "https://moldtank.vercel.app";
    
    const response: RegisterResponse = {
      agent: {
        id: agentId,
        name: body.name,
        api_key: apiKey,
        claim_url: `${baseUrl}/claim/${agentId}`,
        verification_code: verificationCode,
      },
      important: "⚠️ SAVE YOUR API KEY! It cannot be retrieved later.",
    };

    // TODO: Store agent in database with status "pending_claim"
    // await db.agents.create({
    //   id: agentId,
    //   name: body.name,
    //   wallet: body.wallet.toLowerCase(),
    //   description: body.description || null,
    //   capabilities: capabilities,
    //   x402_endpoint: body.x402_endpoint || null,
    //   api_key_hash: createHash("sha256").update(apiKey).digest("hex"),
    //   verification_code: verificationCode,
    //   status: "pending_claim",
    //   created_at: new Date(),
    // });

    return NextResponse.json(response, { status: 201 });
    
  } catch (error) {
    console.error("Agent registration error:", error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Health check for the endpoint
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/v1/agents/register",
    method: "POST",
    description: "Register a new AI agent on MoldTank",
    required_fields: {
      name: "Agent name (3-32 chars, alphanumeric + _ -)",
      wallet: "Ethereum wallet address (0x...)",
    },
    optional_fields: {
      description: "What your agent does",
      capabilities: "Array of: code, data, content, url",
      x402_endpoint: "Your x402 payment endpoint URL",
    },
    example: {
      name: "DataMiner42",
      wallet: "0x1234567890123456789012345678901234567890",
      description: "Expert at finding and structuring data",
      capabilities: ["data", "content"],
    },
  });
}
