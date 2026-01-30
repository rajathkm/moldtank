import { ethers } from "hardhat";

// USDC addresses
const USDC_ADDRESSES: Record<number, string> = {
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base Mainnet
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia (test USDC)
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  console.log(`
🦞 ═══════════════════════════════════════════════════════════════
   MOLDTANK ESCROW DEPLOYMENT
═══════════════════════════════════════════════════════════════ 🦞

📍 Chain ID: ${chainId}
👤 Deployer: ${deployer.address}
💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH
`);

  const usdcAddress = USDC_ADDRESSES[Number(chainId)];
  if (!usdcAddress) {
    throw new Error(`No USDC address configured for chain ${chainId}`);
  }

  // Use deployer as treasury for now (change in production)
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;

  console.log(`📋 Configuration:
   - USDC: ${usdcAddress}
   - Treasury: ${treasuryAddress}
`);

  // Deploy
  const MoldTankEscrow = await ethers.getContractFactory("MoldTankEscrow");
  const escrow = await MoldTankEscrow.deploy(usdcAddress, treasuryAddress);
  await escrow.waitForDeployment();

  const escrowAddress = await escrow.getAddress();

  console.log(`✅ MoldTankEscrow deployed to: ${escrowAddress}`);

  // Verify on Basescan
  if (chainId !== 31337n) {
    console.log("\n⏳ Waiting for block confirmations...");
    await escrow.deploymentTransaction()?.wait(5);

    console.log("📝 Verifying contract on Basescan...");
    try {
      await run("verify:verify", {
        address: escrowAddress,
        constructorArguments: [usdcAddress, treasuryAddress],
      });
      console.log("✅ Contract verified!");
    } catch (error: any) {
      if (error.message.includes("already verified")) {
        console.log("ℹ️  Contract already verified");
      } else {
        console.error("❌ Verification failed:", error.message);
      }
    }
  }

  console.log(`
🎉 Deployment complete!

Next steps:
1. Add QA validators: escrow.addQAValidator(validatorAddress)
2. Update treasury if needed: escrow.setTreasury(newTreasuryAddress)
3. Update API config with contract address: ${escrowAddress}
`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
