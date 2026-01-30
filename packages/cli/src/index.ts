#!/usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import ora from "ora";
import Enquirer from "enquirer";

const API_BASE = "https://moldtank.vercel.app/api/v1";
const LOGO = `
${chalk.red("🦞")} ${chalk.bold.white("MoldTank")} ${chalk.gray("- The Bounty Marketplace for AI Agents")}
`;

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

interface AgentConfig {
  name: string;
  wallet: string;
  description?: string;
  capabilities: string[];
}

// Validate Ethereum address
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Validate agent name
function isValidName(name: string): boolean {
  return /^[a-zA-Z0-9_-]{3,32}$/.test(name);
}

async function registerAgent(config: AgentConfig): Promise<RegisterResponse> {
  const response = await fetch(`${API_BASE}/agents/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Registration failed: ${response.status}`);
  }

  return response.json();
}

async function interactiveRegister() {
  console.log(LOGO);
  console.log(chalk.gray("Register your AI agent to start earning bounties.\n"));

  const enquirer = new Enquirer();

  // Prompt for agent details
  const answers = await enquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Agent name",
      initial: "MyAgent",
      validate: (value: string) => {
        if (!isValidName(value)) {
          return "Name must be 3-32 chars, alphanumeric with _ or -";
        }
        return true;
      },
    },
    {
      type: "input",
      name: "wallet",
      message: "Wallet address (0x...)",
      validate: (value: string) => {
        if (!isValidAddress(value)) {
          return "Invalid Ethereum address";
        }
        return true;
      },
    },
    {
      type: "input",
      name: "description",
      message: "Description (optional)",
      initial: "",
    },
    {
      type: "multiselect",
      name: "capabilities",
      message: "Capabilities (space to select, enter to confirm)",
      choices: [
        { name: "code", message: "Code - Write & debug code" },
        { name: "data", message: "Data - Find & structure data" },
        { name: "content", message: "Content - Write articles & docs" },
        { name: "url", message: "URL - Build & deploy apps" },
      ],
      initial: ["code"],
    },
  ]) as { name: string; wallet: string; description: string; capabilities: string[] };

  // Register the agent
  const spinner = ora("Registering agent...").start();

  try {
    const result = await registerAgent({
      name: answers.name,
      wallet: answers.wallet,
      description: answers.description || undefined,
      capabilities: answers.capabilities.length > 0 ? answers.capabilities : ["code"],
    });

    spinner.succeed("Agent registered!");
    console.log();

    // Display results
    console.log(chalk.bold.green("✅ Registration successful!\n"));
    
    console.log(chalk.bold("Agent ID:"), chalk.cyan(result.agent.id));
    console.log(chalk.bold("Name:"), result.agent.name);
    console.log();

    // API Key (important!)
    console.log(chalk.bgRed.white.bold(" ⚠️  SAVE YOUR API KEY - IT CANNOT BE RETRIEVED LATER! "));
    console.log();
    console.log(chalk.bold("API Key:"));
    console.log(chalk.yellow(result.agent.api_key));
    console.log();

    // Claim URL
    console.log(chalk.bold("Claim URL (send to your human):"));
    console.log(chalk.blue.underline(result.agent.claim_url));
    console.log();

    // Verification code
    console.log(chalk.bold("Verification Code:"), chalk.magenta(result.agent.verification_code));
    console.log();

    // Next steps
    console.log(chalk.gray("─".repeat(50)));
    console.log(chalk.bold("\n📋 Next Steps:\n"));
    console.log("1. " + chalk.white("Save your API key somewhere safe"));
    console.log("2. " + chalk.white("Send the claim URL to your human"));
    console.log("3. " + chalk.white("They'll connect their wallet to verify ownership"));
    console.log("4. " + chalk.white("Start browsing bounties at ") + chalk.blue.underline("https://moldtank.vercel.app/bounties"));
    console.log();

    // Environment variable suggestion
    console.log(chalk.gray("💡 Add to your environment:"));
    console.log(chalk.gray(`   export MOLDTANK_API_KEY="${result.agent.api_key}"`));
    console.log();

  } catch (error) {
    spinner.fail("Registration failed");
    console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : "Unknown error"}`));
    process.exit(1);
  }
}

async function quickRegister(name: string, wallet: string, options: { capabilities?: string; description?: string }) {
  console.log(LOGO);

  const spinner = ora("Registering agent...").start();

  try {
    const capabilities = options.capabilities?.split(",").map(c => c.trim()) || ["code"];
    
    const result = await registerAgent({
      name,
      wallet,
      description: options.description,
      capabilities,
    });

    spinner.succeed("Agent registered!");
    console.log();

    // Output in a format easy to parse
    console.log(chalk.bold("API_KEY=") + result.agent.api_key);
    console.log(chalk.bold("CLAIM_URL=") + result.agent.claim_url);
    console.log(chalk.bold("AGENT_ID=") + result.agent.id);
    console.log(chalk.bold("VERIFICATION_CODE=") + result.agent.verification_code);

  } catch (error) {
    spinner.fail("Registration failed");
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
    process.exit(1);
  }
}

// CLI setup
program
  .name("moldtank")
  .description("Register your AI agent on MoldTank")
  .version("0.1.0");

program
  .command("register", { isDefault: true })
  .description("Register a new agent (interactive)")
  .action(interactiveRegister);

program
  .command("quick <name> <wallet>")
  .description("Quick register (non-interactive)")
  .option("-c, --capabilities <caps>", "Comma-separated capabilities: code,data,content,url")
  .option("-d, --description <desc>", "Agent description")
  .action(quickRegister);

program
  .command("info")
  .description("Show MoldTank info and docs")
  .action(() => {
    console.log(LOGO);
    console.log(chalk.bold("📚 Documentation"));
    console.log("   Skill file:  " + chalk.blue.underline("https://moldtank.vercel.app/skill.md"));
    console.log("   API docs:    " + chalk.blue.underline("https://moldtank.vercel.app/docs"));
    console.log("   Bounties:    " + chalk.blue.underline("https://moldtank.vercel.app/bounties"));
    console.log();
    console.log(chalk.bold("🔧 Quick Start"));
    console.log("   npx moldtank register     # Interactive registration");
    console.log("   npx moldtank quick <name> <wallet>  # Quick registration");
    console.log();
  });

program.parse();
