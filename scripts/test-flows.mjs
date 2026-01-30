#!/usr/bin/env node
/**
 * 🦞 MoldTank - End-to-End Flow Tests
 * Tests: Agent Registration → Bounty Creation → Submission → Validation → Payout
 */

import crypto from 'crypto';

const API_BASE = process.env.API_URL || 'http://localhost:3000';
const JWT_SECRET = 'moldtank-dev-secret-change-in-production-abc123';

// Test wallets (DO NOT USE IN PRODUCTION)
const TEST_POSTER_WALLET = '0x1111111111111111111111111111111111111111';
const TEST_AGENT_WALLET = '0x2222222222222222222222222222222222222222';

console.log('🦞 MoldTank E2E Flow Tests\n');
console.log(`API: ${API_BASE}\n`);

// Helper: Create JWT token
function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  
  return `${header}.${body}.${signature}`;
}

// Helper: API request
async function api(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 1: Agent Registration Flow
// ═══════════════════════════════════════════════════════════════════════════
async function testAgentRegistration() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Agent Registration Flow');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step 1: Register agent
  const agentName = `test-agent-${Date.now()}`;
  console.log(`1. Registering agent: ${agentName}`);
  
  const registerRes = await api('POST', '/api/v1/agents/register', {
    name: agentName,
    wallet: TEST_AGENT_WALLET,
    x402_endpoint: 'https://example.com/x402',
    capabilities: ['code', 'data'],
  });
  
  if (registerRes.status !== 201 && registerRes.status !== 200) {
    console.log(`   ❌ Registration failed: ${registerRes.data.message || registerRes.status}`);
    return null;
  }
  
  const agent = registerRes.data;
  console.log(`   ✅ Agent registered: ${agent.id || agent.agentId}`);
  console.log(`   API Key: ${agent.apiKey?.slice(0, 20)}...`);
  console.log(`   Verification Code: ${agent.verificationCode}\n`);

  // Step 2: Get agent details
  console.log('2. Fetching agent details');
  const agentId = agent.id || agent.agentId;
  const getRes = await api('GET', `/api/agents/${agentId}`);
  
  if (getRes.status === 200) {
    console.log(`   ✅ Agent found: ${getRes.data.displayName || getRes.data.name}`);
    console.log(`   Status: ${getRes.data.status}\n`);
  } else {
    console.log(`   ⚠️ Could not fetch agent: ${getRes.status}\n`);
  }

  return { agentId, apiKey: agent.apiKey };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 2: Bounty Creation Flow
// ═══════════════════════════════════════════════════════════════════════════
async function testBountyCreation() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Bounty Creation Flow');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create poster token
  const posterToken = createToken({
    agentId: null,
    walletAddress: TEST_POSTER_WALLET,
    type: 'poster',
  });

  // Step 1: Create bounty
  console.log('1. Creating test bounty');
  
  const bountyData = {
    title: `E2E Test Bounty - ${Date.now()}`,
    description: 'Write a Python function that returns the sum of two numbers. The function should be named "add" and take two parameters.',
    amount: 25,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    criteria: {
      type: 'code',
      language: 'python',
      testCases: [
        { name: 'basic_add', input: '2, 3', expectedOutput: '5' },
        { name: 'negative', input: '-1, 1', expectedOutput: '0' },
        { name: 'zero', input: '0, 0', expectedOutput: '0' },
      ],
    },
  };

  const createRes = await api('POST', '/api/bounties', bountyData, posterToken);
  
  if (createRes.status !== 201 && createRes.status !== 200) {
    console.log(`   ❌ Bounty creation failed: ${createRes.data.message || createRes.status}`);
    console.log(`   Response: ${JSON.stringify(createRes.data)}\n`);
    return null;
  }

  const bounty = createRes.data;
  console.log(`   ✅ Bounty created: ${bounty.id}`);
  console.log(`   Slug: ${bounty.slug}`);
  console.log(`   Amount: ${bounty.amount} credits`);
  console.log(`   Status: ${bounty.status}\n`);

  // Step 2: List bounties
  console.log('2. Listing bounties');
  const listRes = await api('GET', '/api/bounties');
  
  if (listRes.status === 200) {
    console.log(`   ✅ Found ${listRes.data.total} bounties`);
    const found = listRes.data.data.find(b => b.id === bounty.id);
    console.log(`   Test bounty visible: ${found ? '✅' : '❌'}\n`);
  }

  return bounty;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 3: Submission Flow
// ═══════════════════════════════════════════════════════════════════════════
async function testSubmissionFlow(bounty, agentData) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Submission Flow');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!bounty) {
    console.log('   ⚠️ Skipping - no bounty available\n');
    return null;
  }

  // Create agent token
  const agentToken = createToken({
    agentId: agentData?.agentId || '00000000-0000-0000-0000-000000000002',
    walletAddress: TEST_AGENT_WALLET,
    type: 'agent',
  });

  // Step 1: Submit solution
  console.log('1. Submitting solution');
  
  const payload = {
    type: 'code',
    code: `def add(a, b):
    return a + b

def main(input_str):
    a, b = map(int, input_str.split(', '))
    return add(a, b)`,
    language: 'python',
  };

  // Create signature (mock for testing)
  const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const signature = `0x${'ab'.repeat(65)}`; // Mock signature

  const submitRes = await api('POST', '/api/submissions', {
    bountyId: bounty.id,
    payload,
    signature,
    metadata: { source: 'e2e-test' },
  }, agentToken);

  if (submitRes.status !== 201 && submitRes.status !== 200) {
    console.log(`   ❌ Submission failed: ${submitRes.data.message || submitRes.status}`);
    console.log(`   This may be expected if agent isn't active or signature invalid\n`);
    return null;
  }

  const submission = submitRes.data;
  console.log(`   ✅ Submission created: ${submission.id}`);
  console.log(`   Status: ${submission.status}`);
  console.log(`   Position: ${submission.position}\n`);

  return submission;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 4: Validation Flow
// ═══════════════════════════════════════════════════════════════════════════
async function testValidationFlow(submission) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Validation Flow');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!submission) {
    console.log('   ⚠️ Skipping - no submission available\n');
    return null;
  }

  // Trigger validation
  console.log('1. Triggering validation');
  
  const validateRes = await api('POST', `/api/submissions/${submission.id}/validate`);
  
  console.log(`   Status: ${validateRes.status}`);
  console.log(`   Result: ${JSON.stringify(validateRes.data, null, 2).slice(0, 500)}\n`);

  if (validateRes.data.result) {
    console.log('2. Validation Result:');
    console.log(`   Passed: ${validateRes.data.result.passed ? '✅' : '❌'}`);
    console.log(`   Score: ${validateRes.data.result.score}/100`);
    
    if (validateRes.data.result.checks) {
      console.log('   Checks:');
      for (const check of validateRes.data.result.checks) {
        console.log(`     ${check.passed ? '✅' : '❌'} ${check.name}: ${check.message}`);
      }
    }
    console.log('');
  }

  return validateRes.data;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 5: Payout Flow
// ═══════════════════════════════════════════════════════════════════════════
async function testPayoutFlow(bounty) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Payout Flow');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!bounty) {
    console.log('   ⚠️ Skipping - no bounty available\n');
    return;
  }

  // Check payout status
  console.log('1. Checking payout status');
  
  const statusRes = await api('GET', `/api/bounties/${bounty.id}/payout`);
  
  console.log(`   Bounty Status: ${statusRes.data.status}`);
  console.log(`   Escrow Status: ${statusRes.data.escrowStatus}`);
  console.log(`   Winner: ${statusRes.data.winnerId || 'None yet'}`);
  console.log(`   Payout: ${statusRes.data.winnerPayout} credits\n`);

  // Try to trigger payout (will fail if no winner)
  if (statusRes.data.status === 'completed' && statusRes.data.winnerId) {
    console.log('2. Triggering payout');
    
    const payoutRes = await api('POST', `/api/bounties/${bounty.id}/payout`);
    
    if (payoutRes.status === 200) {
      console.log(`   ✅ Payout successful!`);
      console.log(`   TX Hash: ${payoutRes.data.txHash}`);
      console.log(`   Amount: ${payoutRes.data.amount} USDC\n`);
    } else {
      console.log(`   ⚠️ Payout: ${payoutRes.data.message || payoutRes.status}\n`);
    }
  } else {
    console.log('2. Payout not available yet (bounty not completed or no winner)\n');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN ALL TESTS
// ═══════════════════════════════════════════════════════════════════════════
async function runTests() {
  try {
    // Check API is up
    const healthRes = await api('GET', '/api/health');
    if (healthRes.status !== 200) {
      console.log('❌ API not available. Start the server first.\n');
      process.exit(1);
    }
    console.log(`✅ API healthy: ${healthRes.data.name}\n`);

    // Run tests
    const agentData = await testAgentRegistration();
    const bounty = await testBountyCreation();
    const submission = await testSubmissionFlow(bounty, agentData);
    const validation = await testValidationFlow(submission);
    await testPayoutFlow(bounty);

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(`Agent Registration: ${agentData ? '✅' : '❌'}`);
    console.log(`Bounty Creation: ${bounty ? '✅' : '❌'}`);
    console.log(`Submission: ${submission ? '✅' : '⚠️ (may need active agent)'}`);
    console.log(`Validation: ${validation ? '✅' : '⚠️ (needs submission)'}`);
    console.log(`Payout: ⚠️ (needs completed bounty with winner)\n`);

  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

runTests();
