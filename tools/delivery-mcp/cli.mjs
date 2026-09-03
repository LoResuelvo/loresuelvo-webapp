#!/usr/bin/env node
import { inspectDelivery } from "./lib/inspect-delivery.mjs";
import { prepareDelivery } from "./lib/prepare-delivery.mjs";
import {
  DeliveryInspectInputSchema,
  DeliveryPrepareInputSchema,
  DeliveryContextInputSchema,
  formatInputIssues,
} from "./lib/input-schema.mjs";
import {
  loadDeliveryContext,
  saveDeliveryContext,
  clearDeliveryContext,
  consumeDeliveryContext,
  validateDeliveryContext,
} from "./lib/delivery-context.mjs";
import { captureGitSnapshot } from "./lib/git-snapshot.mjs";
import { findRepoRoot } from "./lib/repo-root.mjs";

function usage() {
  return `Usage:
  npm run delivery:inspect -- [options]
  npm run delivery:prepare -- [options]
  npm run delivery:context -- [options]

Options for delivery:inspect / delivery:prepare:
  --intent <prepare_commit|close_scenario|close_batch|close_us>
  --message <commit message>
  --feature <features/...feature>
  --scenario <scenario name>
  --scope <features/...feature>                  Repeat for a batch or US scope
  --acknowledge-snapshot <sha256>                Required to accept maintainability signals
  --acknowledge-decision <signalId>=<reason>     Per-signal decision (repeatable)
  --acknowledge-decisions-json '<json>'          JSON map of signalId -> justification
  --acknowledge-reason <reason>                  Optional context reason for signals
  --pretty                                       Pretty-print JSON instead of compact JSON
  --help

Options for delivery:context:
  --intent <close_scenario|close_batch|close_us|prepare_commit>
  --feature <features/...feature>
  --scenario <scenario name>
  --scope-files <comma-separated feature files>
  --scope <feature file>                         (repeatable)
  --us-id <US-XX>
  --inspect, --show                              Display active delivery context
  --clear                                        Clear active delivery context
  --consume                                      Mark active delivery context as consumed`;
}

function takeValue(args, index, option) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${option} requires a value`);
  return value;
}

function parseArguments(argv) {
  const args = [...argv];
  let command = "inspect";
  if (args[0] === "inspect" || args[0] === "prepare" || args[0] === "context") {
    command = args.shift();
  }
  const input = { intent: "prepare_commit", scopeFiles: [] };
  let contextAction = "set";
  let pretty = false;
  let acknowledgementSnapshot = "";
  let acknowledgementReason = "";
  const acknowledgementDecisions = {};

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option === "--help" || option === "-h") {
      return { help: true, command, contextAction, input, pretty };
    }
    if (option === "--pretty") {
      pretty = true;
      continue;
    }
    if (option === "--inspect" || option === "--show") {
      contextAction = "inspect";
      continue;
    }
    if (option === "--clear") {
      contextAction = "clear";
      continue;
    }
    if (option === "--consume") {
      contextAction = "consume";
      continue;
    }

    const value = takeValue(args, index, option);
    index += 1;
    if (option === "--intent") input.intent = value;
    else if (option === "--message") input.proposedCommitMessage = value;
    else if (option === "--feature") input.featureFile = value;
    else if (option === "--scenario") input.scenarioName = value;
    else if (option === "--us-id") input.usId = value;
    else if (option === "--scope") input.scopeFiles.push(value);
    else if (option === "--scope-files") {
      const files = value.split(",").map((f) => f.trim()).filter(Boolean);
      input.scopeFiles.push(...files);
    } else if (option === "--acknowledge-snapshot") acknowledgementSnapshot = value;
    else if (option === "--acknowledge-reason") acknowledgementReason = value;
    else if (option === "--acknowledge-decision") {
      const eqIdx = value.indexOf("=");
      if (eqIdx === -1) {
        throw new Error("--acknowledge-decision format must be <signalId>=<justification>");
      }
      const sigId = value.slice(0, eqIdx).trim();
      const just = value.slice(eqIdx + 1).trim();
      acknowledgementDecisions[sigId] = just;
    } else if (option === "--acknowledge-decisions-json") {
      try {
        const parsedJson = JSON.parse(value);
        Object.assign(acknowledgementDecisions, parsedJson);
      } catch (e) {
        throw new Error(`Invalid JSON in --acknowledge-decisions-json: ${e.message}`);
      }
    } else {
      throw new Error(`Unknown option: ${option}`);
    }
  }

  if (acknowledgementSnapshot || Object.keys(acknowledgementDecisions).length > 0 || acknowledgementReason) {
    input.acknowledgement = {
      snapshotHash: acknowledgementSnapshot,
      ...(acknowledgementReason ? { reason: acknowledgementReason } : {}),
      ...(Object.keys(acknowledgementDecisions).length > 0 ? { decisions: acknowledgementDecisions } : {}),
    };
  }
  return { help: false, command, contextAction, input, pretty };
}

function exitCode(command, status) {
  if (command === "inspect") {
    return status === "ready" || status === "no_changes" ? 0 : 2;
  }
  if (status === "passed" || status === "no_changes") return 0;
  return status === "failed" ? 3 : 2;
}

function writeJson(value, pretty) {
  process.stdout.write(`${JSON.stringify(value, null, pretty ? 2 : 0)}\n`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const root = findRepoRoot();

  if (options.command === "context") {
    if (options.contextAction === "clear") {
      const res = await clearDeliveryContext({ repoRoot: root });
      writeJson(res, options.pretty);
      process.exitCode = 0;
      return;
    }
    if (options.contextAction === "inspect") {
      const context = await loadDeliveryContext({ repoRoot: root });
      if (!context) {
        writeJson({ active: false, context: null }, options.pretty);
        process.exitCode = 0;
        return;
      }
      const snapshot = await captureGitSnapshot({ cwd: root });
      const validation = validateDeliveryContext({ context, snapshot });
      writeJson({ active: validation.valid, context, validation }, options.pretty);
      process.exitCode = 0;
      return;
    }
    if (options.contextAction === "consume") {
      const res = await consumeDeliveryContext({ repoRoot: root });
      writeJson(res, options.pretty);
      process.exitCode = 0;
      return;
    }

    const parsed = DeliveryContextInputSchema.safeParse(options.input);
    if (!parsed.success) throw new Error(formatInputIssues(parsed.error));

    const snapshot = await captureGitSnapshot({ cwd: root });
    const saved = await saveDeliveryContext({
      repoRoot: root,
      snapshot,
      intent: parsed.data.intent,
      usId: parsed.data.usId,
      featureFile: parsed.data.featureFile,
      scenarioName: parsed.data.scenarioName,
      scopeFiles: parsed.data.scopeFiles,
    });
    writeJson(saved, options.pretty);
    process.exitCode = 0;
    return;
  }

  const schema = options.command === "prepare" ? DeliveryPrepareInputSchema : DeliveryInspectInputSchema;
  const parsed = schema.safeParse(options.input);
  if (!parsed.success) throw new Error(formatInputIssues(parsed.error));

  const result =
    options.command === "prepare"
      ? await prepareDelivery({ ...parsed.data, repoRoot: root })
      : (await inspectDelivery({ ...parsed.data, repoRoot: root })).result;
  writeJson(result, options.pretty);
  process.exitCode = exitCode(options.command, result.status);
}

main().catch((error) => {
  writeJson(
    {
      schemaVersion: 1,
      status: "blocked",
      diagnostics: [
        {
          code: "DELIVERY_CLI_ERROR",
          message: String(error.message || "Delivery command failed").split("\n")[0],
          retryable: false,
        },
      ],
    },
    false
  );
  process.exitCode = 1;
});
