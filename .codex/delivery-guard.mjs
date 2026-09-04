#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findRepoRoot } from "../tools/delivery-mcp/lib/repo-root.mjs";
import { captureGitSnapshot } from "../tools/delivery-mcp/lib/git-snapshot.mjs";
import { verifyPreparedEvidence } from "../tools/delivery-mcp/lib/delivery-ledger.mjs";

const COMMAND_SEPARATORS = new Set([";", "&&", "||", "|", "&"]);
const PREFIX_COMMANDS = new Set([
  "bash",
  "command",
  "env",
  "nohup",
  "rtk",
  "sh",
  "sudo",
  "time",
]);
const GIT_OPTIONS_WITH_VALUE = new Set([
  "-C",
  "-c",
  "--config-env",
  "--exec-path",
  "--git-dir",
  "--namespace",
  "--super-prefix",
  "--work-tree",
]);

function tokenizeShellCommand(rawCommand) {
  const tokens = [];
  let token = "";
  let quote = null;
  let escaped = false;

  for (let index = 0; index < rawCommand.length; index += 1) {
    const char = rawCommand[index];
    if (escaped) {
      token += char;
      escaped = false;
      continue;
    }
    if (char === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      else token += char;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (token) tokens.push(token);
      token = "";
      tokens.push(";");
      if (char === "\r" && rawCommand[index + 1] === "\n") index += 1;
      continue;
    }
    if (/\s/.test(char)) {
      if (token) tokens.push(token);
      token = "";
      continue;
    }
    if (";|&".includes(char)) {
      if (token) tokens.push(token);
      token = "";
      const next = rawCommand[index + 1];
      if ((char === "&" || char === "|") && next === char) {
        tokens.push(`${char}${next}`);
        index += 1;
      } else {
        tokens.push(char);
      }
      continue;
    }
    token += char;
  }
  if (token) tokens.push(token);
  return tokens;
}

function isEnvironmentAssignment(token) {
  return /^[A-Za-z_][A-Za-z0-9_]*=.*/.test(token);
}

function shellScriptArgument(tokens, index) {
  for (let current = index + 1; current < tokens.length; current += 1) {
    const option = tokens[current];
    if (!option.startsWith("-")) return null;
    if (option === "-c" || /^-[a-zA-Z]*c[a-zA-Z]*$/.test(option)) {
      return tokens[current + 1] || null;
    }
  }
  return null;
}

function isGitCommitInvocation(tokens) {
  let index = 0;
  while (isEnvironmentAssignment(tokens[index])) index += 1;

  while (PREFIX_COMMANDS.has(tokens[index])) {
    const prefix = tokens[index];
    if (prefix === "bash" || prefix === "sh") {
      const script = shellScriptArgument(tokens, index);
      return Boolean(script && isGitCommitCommand(script));
    }
    index += 1;
    if (prefix === "env") {
      while (tokens[index]?.startsWith("-") || isEnvironmentAssignment(tokens[index])) index += 1;
    } else if (prefix === "sudo") {
      while (tokens[index]?.startsWith("-")) {
        const option = tokens[index];
        index += 1;
        if (option === "-u" || option === "-g" || option === "-h" || option === "-p" || option === "-r" || option === "-t" || option === "-C") {
          index += 1;
        }
      }
    }
  }

  if (tokens[index] !== "git") return false;
  index += 1;
  while (index < tokens.length) {
    const argument = tokens[index];
    if (GIT_OPTIONS_WITH_VALUE.has(argument)) {
      index += 2;
      continue;
    }
    if (argument.startsWith("-C") || argument.startsWith("-c")) {
      index += 1;
      continue;
    }
    if (argument.startsWith("--")) {
      index += 1;
      continue;
    }
    return argument === "commit";
  }
  return false;
}

export function isGitCommitCommand(rawCommand) {
  if (!rawCommand || typeof rawCommand !== "string") return false;
  const tokens = tokenizeShellCommand(rawCommand);
  let segment = [];
  for (const token of [...tokens, ";"]) {
    if (COMMAND_SEPARATORS.has(token)) {
      if (isGitCommitInvocation(segment)) return true;
      segment = [];
    } else {
      segment.push(token);
    }
  }
  return false;
}

/**
 * Anticipatory delivery guard for Codex environments.
 * Checks staged delivery status before git commit is invoked.
 * Strictly read-only: never initiates gate tests or executions.
 * Requires a valid prepared receipt for the current staged snapshot.
 */
export async function runCodexGuard({ repoRoot = findRepoRoot(), rawCommand = "" } = {}) {
  if (rawCommand && !isGitCommitCommand(rawCommand)) {
    return { shouldIntercept: false, passed: true, status: "ignored" };
  }

  const snapshot = await captureGitSnapshot({ cwd: repoRoot });
  if (snapshot.stagedFiles.length === 0) {
    return {
      shouldIntercept: true,
      passed: false,
      status: "no_changes",
      message: "No staged changes to commit. Stage files and invoke MCP delivery_prepare first.",
    };
  }

  const verification = await verifyPreparedEvidence({ repoRoot, snapshot });
  if (verification.valid) {
    return {
      shouldIntercept: true,
      passed: true,
      status: "passed",
      gateId: verification.prepared.gateId || "NONE",
      cached: true,
    };
  }

  return {
    shouldIntercept: true,
    passed: false,
    status: verification.reason,
    message: "Invoke MCP delivery_prepare for the current staged snapshot",
  };
}

export function parseCodexHookInput(rawInput) {
  if (!rawInput || !rawInput.trim()) return { toolName: null, rawCommand: "" };
  const parsed = JSON.parse(rawInput);
  return {
    toolName: typeof parsed.tool_name === "string" ? parsed.tool_name : null,
    rawCommand:
      typeof parsed.tool_input?.command === "string" ? parsed.tool_input.command : "",
  };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const argvCommand = process.argv.slice(2).join(" ");
  const hookInput = argvCommand ? null : parseCodexHookInput(await readStdin());
  const rawCommand = argvCommand || hookInput?.rawCommand || "";
  const root = findRepoRoot();

  const outcome = await runCodexGuard({ repoRoot: root, rawCommand });

  if (!outcome.shouldIntercept) {
    process.exit(0);
  }

  if (outcome.passed) {
    process.exit(0);
  } else {
    const reason = outcome.message || "Invoke MCP delivery_prepare for the current staged snapshot";
    process.stdout.write(
      `${JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: reason,
        },
      })}\n`
    );
    process.exit(0);
  }
}

const currentFile = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && path.resolve(process.argv[1]) === currentFile;
if (isMain) {
  main().catch((err) => {
    process.stderr.write(
      `[codex-delivery-guard] Internal error: ${String(err.message || "unknown").split("\n")[0]}\n`
    );
    process.exit(2);
  });
}
