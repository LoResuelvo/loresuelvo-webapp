import crypto from "node:crypto";
import { redactSecrets } from "./redact-secrets.mjs";

const ANSI_ESCAPE = /\u001b\[[0-?]*[ -/]*[@-~]|\u001b\].*?(?:\u0007|\u001b\\)/g;
const NOISE_LINE_PREFIXES = [/^\s*at\s+/i, /^\s*node:internal\//i, /^\s*node:events/i, /^\s*\(node:\d+\)/i];
const DIVIDER_REGEX = /^[⎯\-=_\*~#]{4,}\s*$/;
const LOCATION_REGEX = /(?:^|[\s(])([A-Za-z0-9._/-]+\.[a-zA-Z0-9]+):([0-9]+)(?::[0-9]+)?/;
const TSC_LOCATION_REGEX = /(?:^|[\s(])([A-Za-z0-9._/-]+\.[a-zA-Z0-9]+)\(([0-9]+),[0-9]+\)/;
const VITEST_LOCATION_REGEX = /❯\s+([A-Za-z0-9._/-]+\.[a-zA-Z0-9]+):([0-9]+)/;
const CUCUMBER_LOCATION_REGEX = /#\s+([A-Za-z0-9._/-]+\.(?:feature|ts|js|mjs)):([0-9]+)/;
const FAILURE_SIGNAL = /(?:error|failed|failure|expected|received|not found|timed? out|×|✗|cannot find|missing)/i;

export function stripAnsi(text) {
  if (!text || typeof text !== "string") return "";
  return text.replace(ANSI_ESCAPE, "");
}

export function cleanLine(line) {
  if (!line || typeof line !== "string") return "";
  return stripAnsi(line).replace(/\s+/g, " ").trim();
}

export function isNoiseLine(line) {
  if (!line) return true;
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (DIVIDER_REGEX.test(trimmed)) return true;
  for (const prefix of NOISE_LINE_PREFIXES) {
    if (prefix.test(trimmed)) return true;
  }
  return false;
}

export function normalizePathLocation(rawPath) {
  if (!rawPath || typeof rawPath !== "string") return "";
  let p = rawPath.replaceAll("\\", "/").trim();
  // Strip relative prefix ./
  p = p.replace(/^\.\//, "");
  // If absolute path containing project directory, make it relative
  const match = p.match(/(?:(?:^|\/)loresuelvo-webapp\/)(.+)$/);
  if (match) p = match[1];
  return p;
}

export function extractLocations(text, max = 6) {
  if (!text || typeof text !== "string") return [];
  const cleanText = stripAnsi(text);
  const lines = cleanText.split(/\r?\n/);
  const locations = [];

  for (const line of lines) {
    if (locations.length >= max) break;

    // 1. Vitest ❯ path:line
    const vitestMatch = line.match(VITEST_LOCATION_REGEX);
    if (vitestMatch) {
      const loc = `${normalizePathLocation(vitestMatch[1])}:${vitestMatch[2]}`;
      if (!locations.includes(loc)) locations.push(loc);
      continue;
    }

    // 2. Cucumber # path:line
    const cukeMatch = line.match(CUCUMBER_LOCATION_REGEX);
    if (cukeMatch) {
      const loc = `${normalizePathLocation(cukeMatch[1])}:${cukeMatch[2]}`;
      if (!locations.includes(loc)) locations.push(loc);
      continue;
    }

    // 3. TSC file(line,col)
    const tscMatch = line.match(TSC_LOCATION_REGEX);
    if (tscMatch) {
      const loc = `${normalizePathLocation(tscMatch[1])}:${tscMatch[2]}`;
      if (!locations.includes(loc)) locations.push(loc);
      continue;
    }

    // 4. Standard file:line
    const stdMatch = line.match(LOCATION_REGEX);
    if (stdMatch) {
      const filePath = stdMatch[1];
      // Exclude node internal names or obvious non-files
      if (!filePath.includes("node:") && !filePath.endsWith(".lock")) {
        const loc = `${normalizePathLocation(filePath)}:${stdMatch[2]}`;
        if (!locations.includes(loc)) locations.push(loc);
      }
    }
  }

  return locations.slice(0, max);
}

export function deduplicateLines(lines, maxLines = 6) {
  const unique = [];
  const seen = new Set();

  for (const rawLine of lines) {
    if (unique.length >= maxLines) break;
    const cleaned = cleanLine(rawLine);
    if (!cleaned || isNoiseLine(cleaned)) continue;

    const signature = cleaned.toLowerCase();
    if (!seen.has(signature)) {
      seen.add(signature);
      unique.push(redactSecrets(cleaned).slice(0, 300));
    }
  }

  return unique;
}

export function computeFailureSignature({ checkId, exitCode, message, locations }) {
  const normalizedMessage = (message || "").trim().toLowerCase().replace(/\s+/g, " ");
  const normalizedLocations = [...(locations || [])].sort().join(";");
  const raw = `${checkId || "unknown"}|${exitCode ?? "none"}|${normalizedMessage}|${normalizedLocations}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// ---------------------------------------------------------------------------
// 1. Vitest Parser
// ---------------------------------------------------------------------------
export function parseVitestDiagnostics(output, options = {}) {
  const maxSummaryLines = options.maxSummaryLines ?? 6;
  const maxLocations = options.maxLocations ?? 6;
  const clean = stripAnsi(output || "");

  // 1. Counts (anchored to start of line to avoid header like "Failed Tests 1")
  const counts = { passed: 0, failed: 0, skipped: 0 };
  const testsMatch = clean.match(/^\s*Tests\s+([^\n]+)/m);
  if (testsMatch) {
    const text = testsMatch[1];
    const p = text.match(/(\d+)\s+passed/);
    const f = text.match(/(\d+)\s+failed/);
    const s = text.match(/(\d+)\s+(?:skipped|todo)/);
    if (p) counts.passed = Number.parseInt(p[1], 10);
    if (f) counts.failed = Number.parseInt(f[1], 10);
    if (s) counts.skipped = Number.parseInt(s[1], 10);
  }

  // 2. Failed test line (e.g. FAIL components/Auth.test.tsx > AuthForm > renders error)
  let testFile = null;
  let testName = null;
  const failMatch = clean.match(/(?:FAIL|×|✗)\s+([A-Za-z0-9._/-]+\.(?:test|spec)\.[cm]?[jt]sx?)(?:\s*>\s*([^\n]+))?/i);
  if (failMatch) {
    testFile = normalizePathLocation(failMatch[1]);
    testName = failMatch[2] ? failMatch[2].trim() : null;
  }

  // 3. Assertion mismatch (Expected vs Received)
  let assertionMismatch = null;
  const assertMatch = clean.match(/AssertionError:\s*([^\n]+)/i);
  if (assertMatch) {
    assertionMismatch = cleanLine(assertMatch[1]).replace(/\s*\/\/\s*Object\.is.*$/, "");
  } else {
    // Check - Expected / + Received blocks
    const expMatch = clean.match(/-\s*Expected:?\s*([^\n]+)\s*\n\+\s*Received:?\s*([^\n]+)/i);
    if (expMatch) {
      assertionMismatch = `Expected: ${cleanLine(expMatch[1])}, Received: ${cleanLine(expMatch[2])}`;
    } else {
      const expLineMatch = clean.match(/Expected:\s*([^\n]+)\s*\n\s*Received:\s*([^\n]+)/i);
      if (expLineMatch) {
        assertionMismatch = `Expected: ${cleanLine(expLineMatch[1])}, Received: ${cleanLine(expLineMatch[2])}`;
      } else {
        const toMatch = clean.match(/expected\s+([^\n]+?)\s+to\s+(?:deeply\s+equal|be|equal|match)\s+([^\n]+)/i);
        if (toMatch) {
          assertionMismatch = cleanLine(toMatch[0]);
        }
      }
    }
  }

  let errorLine = null;
  const errMatch = clean.match(/^(?:Error|TypeError|ReferenceError):\s*([^\n]+)/m);
  if (errMatch) {
    errorLine = cleanLine(errMatch[0]);
  }

  // 4. Locations
  const locations = extractLocations(clean, maxLocations);

  // 5. Build summaryLines
  const summaryCandidates = [];
  if (testFile) {
    summaryCandidates.push(`FAIL ${testFile}${testName ? ` > ${testName}` : ""}`);
  }
  if (assertionMismatch) {
    summaryCandidates.push(assertionMismatch);
  } else if (errorLine) {
    summaryCandidates.push(errorLine);
  }
  if (locations.length > 0) {
    summaryCandidates.push(locations[0]);
  }
  if (testsMatch) {
    summaryCandidates.push(`Tests: ${cleanLine(testsMatch[1])}`);
  }

  // If we couldn't extract specific lines, fall back to lines matching failure signals
  if (summaryCandidates.length === 0) {
    const rawLines = clean
      .split(/\r?\n/)
      .map(cleanLine)
      .filter((l) => l && !isNoiseLine(l) && FAILURE_SIGNAL.test(l));
    summaryCandidates.push(...rawLines);
  }

  const summaryLines = deduplicateLines(summaryCandidates, maxSummaryLines);

  let message = "";
  if (testFile) {
    const detail = assertionMismatch || errorLine || "";
    message = `FAIL ${testFile}${testName ? ` > ${testName}` : ""}${detail ? `: ${detail}` : ""}`;
  } else if (assertionMismatch) {
    message = assertionMismatch;
  } else if (errorLine) {
    message = errorLine;
  } else if (summaryLines.length > 0) {
    message = summaryLines[0];
  } else {
    message = "Vitest unit tests failed";
  }

  return {
    family: "vitest",
    counts,
    testFile,
    testName,
    assertionMismatch,
    locations,
    summaryLines,
    message: cleanLine(redactSecrets(message)).slice(0, 300),
  };
}

// ---------------------------------------------------------------------------
// 2. Cucumber Parser
// ---------------------------------------------------------------------------
export function parseCucumberDiagnostics(output, options = {}) {
  const maxSummaryLines = options.maxSummaryLines ?? 6;
  const maxLocations = options.maxLocations ?? 6;
  const clean = stripAnsi(output || "");

  // 1. Counts
  const counts = { passed: 0, failed: 0, skipped: 0 };
  const scenarioCountMatch = clean.match(/(\d+)\s+scenarios?\s*\(([^)]+)\)/i);
  if (scenarioCountMatch) {
    const details = scenarioCountMatch[2];
    const p = details.match(/(\d+)\s+passed/);
    const f = details.match(/(\d+)\s+failed/);
    const s = details.match(/(\d+)\s+(?:skipped|pending|undefined)/);
    if (p) counts.passed = Number.parseInt(p[1], 10);
    if (f) counts.failed = Number.parseInt(f[1], 10);
    if (s) counts.skipped = Number.parseInt(s[1], 10);
  }

  // 2. Scenario & Step
  let scenarioName = null;
  let featureLocation = null;
  const scenarioMatch = clean.match(/(?:Scenario|Scenario Outline):\s*([^\n#]+?)(?:\s*#\s*([A-Za-z0-9._/-]+\.feature:(\d+)))?(?:\r?\n|$)/i);
  if (scenarioMatch) {
    scenarioName = cleanLine(scenarioMatch[1]);
    if (scenarioMatch[2]) {
      featureLocation = normalizePathLocation(scenarioMatch[2]);
    }
  }

  let stepText = null;
  let stepLocation = null;
  const stepMatch = clean.match(/^\s*(?:✖|✗|\?)\s*([^\n#]+?)(?:\s*#\s*([A-Za-z0-9._/-]+:(\d+)))?(?:\r?\n|$)/im);
  if (stepMatch) {
    stepText = cleanLine(stepMatch[1]);
    if (stepMatch[2]) {
      stepLocation = normalizePathLocation(stepMatch[2]);
    }
  }

  // 3. Step error message
  let errorMsg = null;
  const errorMatch = clean.match(/^\s*(?:Error|AssertionError):\s*([^\n]+)/im);
  if (errorMatch) {
    errorMsg = cleanLine(errorMatch[1]);
  } else if (clean.includes("Undefined. Implement with the following snippet")) {
    errorMsg = "Step implementation undefined";
  }

  // 4. Locations
  const locations = [];
  if (featureLocation && !locations.includes(featureLocation)) locations.push(featureLocation);
  if (stepLocation && !locations.includes(stepLocation)) locations.push(stepLocation);
  for (const loc of extractLocations(clean, maxLocations)) {
    if (!locations.includes(loc)) locations.push(loc);
    if (locations.length >= maxLocations) break;
  }

  // 5. Summary lines
  const summaryCandidates = [];
  if (scenarioName) {
    summaryCandidates.push(`Scenario: ${scenarioName}${featureLocation ? ` (${featureLocation})` : ""}`);
  }
  if (stepText) {
    summaryCandidates.push(`Step: ${stepText}${stepLocation ? ` (${stepLocation})` : ""}`);
  }
  if (errorMsg) {
    summaryCandidates.push(`Error: ${errorMsg}`);
  }
  if (scenarioCountMatch) {
    summaryCandidates.push(cleanLine(scenarioCountMatch[0]));
  }

  if (summaryCandidates.length === 0) {
    const rawLines = clean
      .split(/\r?\n/)
      .map(cleanLine)
      .filter((l) => l && !isNoiseLine(l) && FAILURE_SIGNAL.test(l));
    summaryCandidates.push(...rawLines);
  }

  const summaryLines = deduplicateLines(summaryCandidates, maxSummaryLines);

  let message = "";
  if (scenarioName) {
    message = `Scenario: ${scenarioName} failed${stepText ? ` at '${stepText}'` : ""}${errorMsg ? `: ${errorMsg}` : ""}`;
  } else if (errorMsg) {
    message = errorMsg;
  } else if (summaryLines.length > 0) {
    message = summaryLines[0];
  } else {
    message = "Cucumber scenario failed";
  }

  return {
    family: "cucumber",
    counts,
    scenarioName,
    stepText,
    locations,
    summaryLines,
    message: cleanLine(redactSecrets(message)).slice(0, 300),
  };
}

// ---------------------------------------------------------------------------
// 3. TypeScript (tsc) Parser
// ---------------------------------------------------------------------------
export function parseTscDiagnostics(output, options = {}) {
  const maxSummaryLines = options.maxSummaryLines ?? 6;
  const maxLocations = options.maxLocations ?? 6;
  const clean = stripAnsi(output || "");

  const errorMatches = [];
  const lines = clean.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = cleanLine(line);
    // Format 1: file.ts(15,7): error TS2322: Message
    // Format 2: file.ts:15:7 - error TS2322: Message
    const m = trimmed.match(/^([A-Za-z0-9._/-]+\.[a-zA-Z0-9]+)(?:\((\d+),\d+\)|:(\d+)(?::\d+)?)(?::|\s*-)?\s*error\s+(TS\d+):\s*(.+)$/i);
    if (m) {
      const file = normalizePathLocation(m[1]);
      const lineNum = m[2] || m[3] || "1";
      const code = m[4].toUpperCase();
      const message = cleanLine(m[5]);
      errorMatches.push({ file, line: lineNum, code, message });
    }
  }

  const errorCodes = [...new Set(errorMatches.map((e) => e.code))];
  const locations = [...new Set(errorMatches.map((e) => `${e.file}:${e.line}`))].slice(0, maxLocations);
  const totalErrors = errorMatches.length;
  const counts = { passed: 0, failed: totalErrors, skipped: 0 };

  const summaryCandidates = errorMatches.map((e) => `${e.file}:${e.line}: error ${e.code}: ${e.message}`);
  const summaryLines = deduplicateLines(summaryCandidates, maxSummaryLines);

  let message = "";
  if (errorMatches.length > 0) {
    const first = errorMatches[0];
    message = `${first.code} in ${first.file}:${first.line}: ${first.message}`;
  } else if (summaryLines.length > 0) {
    message = summaryLines[0];
  } else {
    message = "TypeScript typecheck failed";
  }

  return {
    family: "tsc",
    counts,
    errorCodes,
    locations,
    summaryLines,
    message: cleanLine(redactSecrets(message)).slice(0, 300),
  };
}

// ---------------------------------------------------------------------------
// 4. ESLint Parser
// ---------------------------------------------------------------------------
export function parseEslintDiagnostics(output, options = {}) {
  const maxSummaryLines = options.maxSummaryLines ?? 6;
  const maxLocations = options.maxLocations ?? 6;
  const clean = stripAnsi(output || "");

  const rules = [];
  const locations = [];
  const summaryCandidates = [];
  let currentFile = null;
  let totalErrors = 0;
  let totalWarnings = 0;

  const lines = clean.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = cleanLine(line);
    if (!trimmed) continue;

    // File header: e.g. /path/to/file.tsx or components/ui/card.tsx
    if (
      !trimmed.includes(" ") &&
      (trimmed.endsWith(".ts") || trimmed.endsWith(".tsx") || trimmed.endsWith(".js") || trimmed.endsWith(".mjs"))
    ) {
      currentFile = normalizePathLocation(trimmed);
      continue;
    }

    // Problem line: 12:5 error 'unusedVar' is defined but never used @typescript-eslint/no-unused-vars
    const probMatch = trimmed.match(/^(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+([@a-zA-Z0-9_/-]+)$/i);
    if (probMatch) {
      const lineNum = probMatch[1];
      const severity = probMatch[3].toLowerCase();
      const text = cleanLine(probMatch[4]);
      const rule = probMatch[5];

      if (severity === "error") totalErrors += 1;
      else totalWarnings += 1;

      if (!rules.includes(rule)) rules.push(rule);
      const loc = currentFile ? `${currentFile}:${lineNum}` : `line:${lineNum}`;
      if (!locations.includes(loc)) locations.push(loc);

      summaryCandidates.push(`${loc}: ${severity}: ${text} (${rule})`);
      continue;
    }

    // Compact single-line format: file.tsx:12:5: message [rule]
    const singleMatch = trimmed.match(/^([A-Za-z0-9._/-]+\.[a-zA-Z0-9]+):(\d+):(?:\d+:)?\s*(.+?)\s*(?:\[([@a-zA-Z0-9_/-]+)\]|\(([@a-zA-Z0-9_/-]+)\))$/);
    if (singleMatch) {
      const file = normalizePathLocation(singleMatch[1]);
      const lineNum = singleMatch[2];
      const text = cleanLine(singleMatch[3]);
      const rule = singleMatch[4] || singleMatch[5] || "lint";

      totalErrors += 1;
      if (!rules.includes(rule)) rules.push(rule);
      const loc = `${file}:${lineNum}`;
      if (!locations.includes(loc)) locations.push(loc);

      summaryCandidates.push(`${loc}: error: ${text} (${rule})`);
      continue;
    }

    // Summary line: ✖ 3 problems (2 errors, 1 warning)
    const sumMatch = trimmed.match(/(\d+)\s+problems?\s*\((\d+)\s+errors?(?:,\s*(\d+)\s+warnings?)?\)/i);
    if (sumMatch) {
      totalErrors = Number.parseInt(sumMatch[2], 10);
      totalWarnings = sumMatch[3] ? Number.parseInt(sumMatch[3], 10) : 0;
    }
  }

  const counts = { passed: 0, failed: totalErrors || summaryCandidates.length, skipped: 0 };
  const boundedLocations = locations.slice(0, maxLocations);

  if (totalErrors > 0 || totalWarnings > 0) {
    summaryCandidates.push(`ESLint: ${totalErrors} error(s), ${totalWarnings} warning(s) found`);
  }

  const summaryLines = deduplicateLines(summaryCandidates, maxSummaryLines);

  let message = "";
  if (summaryLines.length > 0) {
    message = summaryLines[0];
  } else {
    message = "ESLint checks failed";
  }

  return {
    family: "eslint",
    counts,
    rules,
    locations: boundedLocations,
    summaryLines,
    message: cleanLine(redactSecrets(message)).slice(0, 300),
  };
}

// ---------------------------------------------------------------------------
// 5. Next.js Build Parser
// ---------------------------------------------------------------------------
export function parseNextBuildDiagnostics(output, options = {}) {
  const maxSummaryLines = options.maxSummaryLines ?? 6;
  const maxLocations = options.maxLocations ?? 6;
  const clean = stripAnsi(output || "");

  // 1. Detect phase
  let phase = "Build";
  if (/Static page generation|Generating static pages/i.test(clean)) {
    phase = "Static page generation";
  } else if (/Collecting page data/i.test(clean)) {
    phase = "Collecting page data";
  } else if (/Linting and checking validity of types|Type checking and linting/i.test(clean)) {
    phase = "Type checking and linting";
  } else if (/Failed to compile/i.test(clean)) {
    phase = "Compiling";
  } else if (/Creating an optimized production build/i.test(clean)) {
    phase = "Creating production build";
  }

  // 2. Extract first causal error
  let causalError = null;
  const lines = clean.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const trimmed = cleanLine(lines[i]);
    if (!trimmed || isNoiseLine(trimmed)) continue;

    if (/^Failed to compile/i.test(trimmed)) {
      // Look at next non-noise lines
      for (let j = i + 1; j < lines.length; j++) {
        const next = cleanLine(lines[j]);
        if (next && !isNoiseLine(next) && !next.startsWith("Import trace") && !next.startsWith("./")) {
          causalError = next;
          break;
        }
      }
      if (causalError) break;
    }

    if (/^(?:Error|TypeError|SyntaxError|ReferenceError):\s*(.+)/i.test(trimmed)) {
      causalError = trimmed;
      break;
    }

    if (/^> Build error occurred/i.test(trimmed)) {
      // Look at following line
      for (let j = i + 1; j < lines.length; j++) {
        const next = cleanLine(lines[j]);
        if (next && !isNoiseLine(next)) {
          causalError = next;
          break;
        }
      }
      if (causalError) break;
    }
  }

  // 3. Locations
  const locations = extractLocations(clean, maxLocations);

  // 4. Summary lines
  const summaryCandidates = [];
  summaryCandidates.push(`Next.js build failed during ${phase}`);
  if (causalError) {
    summaryCandidates.push(causalError);
  }
  if (locations.length > 0) {
    summaryCandidates.push(locations[0]);
  }

  // Check additional causal lines (e.g. Export encountered errors on following paths: /path)
  for (const line of lines) {
    const trimmed = cleanLine(line);
    if (/Export encountered errors on following paths:/i.test(trimmed)) {
      summaryCandidates.push(trimmed);
    }
  }

  const summaryLines = deduplicateLines(summaryCandidates, maxSummaryLines);

  let message = "";
  if (causalError) {
    message = `Next.js build failed during ${phase}: ${causalError}`;
  } else {
    message = `Next.js build failed during ${phase}`;
  }

  return {
    family: "next_build",
    phase,
    causalError,
    locations,
    summaryLines,
    message: cleanLine(redactSecrets(message)).slice(0, 300),
    counts: { passed: 0, failed: 1, skipped: 0 },
  };
}

// ---------------------------------------------------------------------------
// 6. Generic Parser (Fallback)
// ---------------------------------------------------------------------------
export function parseGenericDiagnostics(output, options = {}) {
  const maxSummaryLines = options.maxSummaryLines ?? 6;
  const maxLocations = options.maxLocations ?? 6;
  const clean = stripAnsi(output || "");

  const locations = extractLocations(clean, maxLocations);

  const lines = clean
    .split(/\r?\n/)
    .map(cleanLine)
    .filter((line) => line && !isNoiseLine(line));

  const preferred = lines.filter((line) => FAILURE_SIGNAL.test(line));
  const source = preferred.length > 0 ? preferred : lines.slice(-maxSummaryLines);
  const summaryLines = deduplicateLines(source, maxSummaryLines);

  return {
    family: "generic",
    locations,
    summaryLines,
    message: summaryLines[0] || "Process execution failed",
    counts: { passed: 0, failed: 1, skipped: 0 },
  };
}

// ---------------------------------------------------------------------------
// Family Detection
// ---------------------------------------------------------------------------
export function detectDiagnosticFamily({ check, command, args, output }) {
  const checkId = check?.id || "";
  const cmd = command || check?.command || "";
  const argList = args || check?.args || [];
  const argStr = argList.join(" ");
  const text = output || "";

  // 1. By checkId
  if (checkId === "unit") return "vitest";
  if (checkId === "delivery_unit") return "node_test";
  if (checkId === "typecheck_app" || checkId === "typecheck_cucumber") return "tsc";
  if (checkId === "lint") return "eslint";
  if (checkId === "build") return "next_build";
  if (checkId === "steps_compatibility" || checkId === "e2e_feature" || checkId === "e2e_full") return "cucumber";

  // 2. By command / args
  if (argStr.includes("vitest")) return "vitest";
  if (cmd === "node" && argStr.includes("--test")) return "node_test";
  if (argStr.includes("cucumber-js") || argStr.includes("test-e2e")) return "cucumber";
  if (cmd === "tsc" || argStr.includes("tsc")) return "tsc";
  if (cmd.includes("eslint") || argStr.includes("lint")) return "eslint";
  if (argStr.includes("next") && argStr.includes("build")) return "next_build";

  // 3. By output signatures
  if (/Tests\s+\d+\s+(?:failed|passed)|FAIL\s+[A-Za-z0-9._/-]+\.(?:test|spec)/i.test(text)) return "vitest";
  if (/scenarios?\s*\(\d+\s+(?:failed|passed)|Scenario:\s+/i.test(text)) return "cucumber";
  if (/error\s+TS\d+:/i.test(text)) return "tsc";
  if (/\d+:\d+\s+(?:error|warning)\s+.*[@a-zA-Z0-9_/-]+|\d+\s+problems?\s*\(\d+\s+errors?/i.test(text)) return "eslint";
  if (/Failed to compile|Next\.js|Build error occurred|Collecting page data/i.test(text)) return "next_build";
  if (/ℹ\s+(?:pass|fail)\s+\d+/i.test(text)) return "node_test";

  return "generic";
}

// ---------------------------------------------------------------------------
// Master Diagnostic Parsing Function
// ---------------------------------------------------------------------------
export function parseDiagnostics({
  check,
  command,
  args,
  output,
  outputTail = "",
  outputTruncated = false,
  exitCode = 0,
  signal = null,
  timedOut = false,
  error = null,
  maxSummaryLines = 6,
  maxLocations = 6,
} = {}) {
  const mainOutput = Buffer.isBuffer(output) ? output.toString("utf8") : String(output || "");
  const tailOutput = Buffer.isBuffer(outputTail) ? outputTail.toString("utf8") : String(outputTail || "");
  // The bounded log keeps its head, while the tail contains the final summary
  // and often the causal error. Include it in parsing whenever truncation
  // occurred so diagnostics do not silently report a generic failure merely
  // because the useful line was beyond maxCheckLogBytes.
  const diagnosticOutput = outputTruncated && tailOutput
    ? `${mainOutput}\n${tailOutput}`
    : mainOutput;
  const cleanOutput = stripAnsi(diagnosticOutput);
  const passed = !timedOut && !error && exitCode === 0 && !signal;

  // On success: compact response without raw output
  if (passed) {
    const family = detectDiagnosticFamily({ check, command, args, output: cleanOutput });
    let counts = { passed: 1, failed: 0, skipped: 0 };
    if (family === "vitest") {
      const v = parseVitestDiagnostics(cleanOutput, { maxSummaryLines, maxLocations });
      if (v.counts.passed > 0 || v.counts.failed > 0) counts = v.counts;
    } else if (family === "cucumber") {
      const c = parseCucumberDiagnostics(cleanOutput, { maxSummaryLines, maxLocations });
      if (c.counts.passed > 0 || c.counts.failed > 0) counts = c.counts;
    } else if (family === "node_test") {
      const passM = cleanOutput.match(/ℹ\s+pass\s+(\d+)/);
      const failM = cleanOutput.match(/ℹ\s+fail\s+(\d+)/);
      const skipM = cleanOutput.match(/ℹ\s+(?:skipped|cancelled)\s+(\d+)/);
      if (passM || failM) {
        counts = {
          passed: passM ? Number.parseInt(passM[1], 10) : 0,
          failed: failM ? Number.parseInt(failM[1], 10) : 0,
          skipped: skipM ? Number.parseInt(skipM[1], 10) : 0,
        };
      }
    }

    return {
      family,
      passed: true,
      code: null,
      message: null,
      summaryLines: [],
      locations: [],
      counts,
    };
  }

  // Determine failure code
  let code = "CHECK_FAILED";
  if (timedOut) {
    code = "CHECK_TIMEOUT";
  } else if (error) {
    code = "CHECK_START_FAILED";
  }

  // If timed out or start error, create explicit diagnostic
  if (timedOut) {
    const label = check?.label || check?.id || "Command";
    const msg = `${label} timed out`;
    return {
      family: "generic",
      passed: false,
      code: "CHECK_TIMEOUT",
      message: msg,
      summaryLines: [msg],
      locations: [],
      counts: { passed: 0, failed: 1, skipped: 0 },
    };
  }

  if (error) {
    const msg = cleanLine(error.message || "Process failed to start");
    return {
      family: "generic",
      passed: false,
      code: "CHECK_START_FAILED",
      message: msg,
      summaryLines: [msg],
      locations: [],
      counts: { passed: 0, failed: 1, skipped: 0 },
    };
  }

  // Parse according to family
  const family = detectDiagnosticFamily({ check, command, args, output: cleanOutput });
  let parsedFamily;
  switch (family) {
    case "vitest":
      parsedFamily = parseVitestDiagnostics(cleanOutput, { maxSummaryLines, maxLocations });
      break;
    case "cucumber":
      parsedFamily = parseCucumberDiagnostics(cleanOutput, { maxSummaryLines, maxLocations });
      break;
    case "tsc":
      parsedFamily = parseTscDiagnostics(cleanOutput, { maxSummaryLines, maxLocations });
      break;
    case "eslint":
      parsedFamily = parseEslintDiagnostics(cleanOutput, { maxSummaryLines, maxLocations });
      break;
    case "next_build":
      parsedFamily = parseNextBuildDiagnostics(cleanOutput, { maxSummaryLines, maxLocations });
      break;
    default:
      parsedFamily = parseGenericDiagnostics(cleanOutput, { maxSummaryLines, maxLocations });
      break;
  }

  let summaryLines = parsedFamily.summaryLines || [];
  let message = parsedFamily.message || "";
  const locations = (parsedFamily.locations || []).slice(0, maxLocations);
  const counts = parsedFamily.counts || { passed: 0, failed: 1, skipped: 0 };

  // Fallback for empty or whitespace-only output
  if (summaryLines.length === 0) {
    const fallback = signal
      ? `Process terminated with signal ${signal}`
      : `Process exited with code ${exitCode ?? 1}`;
    summaryLines = [fallback];
    message = fallback;
  }

  if (!message) {
    message = summaryLines[0] || (signal ? `Process terminated with signal ${signal}` : `Process exited with code ${exitCode ?? 1}`);
  }

  // Ensure redactSecrets is applied to message and summaryLines
  message = redactSecrets(cleanLine(message)).slice(0, 300);
  summaryLines = summaryLines.slice(0, maxSummaryLines).map((l) => redactSecrets(cleanLine(l)).slice(0, 300));

  return {
    family,
    passed: false,
    code,
    message,
    summaryLines,
    locations,
    counts,
    ...(parsedFamily.assertionMismatch ? { assertionMismatch: parsedFamily.assertionMismatch } : {}),
    ...(parsedFamily.errorCodes ? { errorCodes: parsedFamily.errorCodes } : {}),
    ...(parsedFamily.rules ? { rules: parsedFamily.rules } : {}),
    ...(parsedFamily.phase ? { phase: parsedFamily.phase } : {}),
  };
}
