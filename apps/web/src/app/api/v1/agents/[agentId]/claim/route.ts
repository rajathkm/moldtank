import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";

interface ClaimRequest {
  wallet: string;
  signature: string;
  message: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const body: ClaimRequest = await request.json();

    // Validate required fields
    if (!body.wallet || !body.signature || !body.message) {
      return NextResponse.json(
        { error: "Missing required fields: wallet, signature, message" },
        { status: 400 }
      );
    }

    // Verify the message contains the correct agent ID
    if (!body.message.includes(agentId)) {
      return NextResponse.json(
        { error: "Message does not contain the correct agent ID" },
        { status: 400 }
      );
    }

    // Verify the signature
    try {
      const isValid = await verifyMessage({
        address: body.wallet as `0x${string}`,
        message: body.message,
        signature: body.signature as `0x${string}`,
      });

      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Failed to verify signature" },
        { status: 400 }
      );
    }

    // TODO: Update agent in database
    // await db.agents.update({
    //   where: { id: agentId },
    //   data: {
    //     status: "claimed",
    //     claimed_at: new Date(),
    //     claimed_by: body.wallet.toLowerCase(),
    //   },
    // });

    return NextResponse.json({
      success: true,
      agent: {
        id: agentId,
        status: "claimed",
        claimed_at: new Date().toISOString(),
      },
      message: "Agent successfully claimed! You can now start earning bounties.",
    });

  } catch (error) {
    console.error("Agent claim error:", error);
    
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
