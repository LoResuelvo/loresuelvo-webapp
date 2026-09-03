import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import { isProductionSourceFile } from "./classify-files.mjs";

const execFileAsync = util.promisify(execFile);

export async function runMaintainabilityAudit({ stagedFiles = [], repoRoot = process.cwd() } = {}) {
  // 1. Filter production files that exist on disk
  const productFiles = [];

  for (const relativeFile of stagedFiles) {
    const normalized = relativeFile.split(path.sep).join("/");
    if (!isProductionSourceFile(normalized)) continue;

    const absoluteFile = path.resolve(repoRoot, normalized);
    const relativeToRepo = path.relative(repoRoot, absoluteFile);

    // Guard against directory traversal or files outside repository
    if (relativeToRepo.startsWith("..") || path.isAbsolute(relativeToRepo)) {
      continue;
    }

    if (fs.existsSync(absoluteFile) && fs.statSync(absoluteFile).isFile()) {
      productFiles.push(normalized);
    }
  }

  if (productFiles.length === 0) {
    return {
      status: "not_applicable",
      filesReviewed: [],
      signalCount: 0,
      signals: [],
    };
  }

  const scriptPath = path.resolve(
    repoRoot,
    ".agents/skills/frontend-maintainability-governance/scripts/audit-changed-code.mjs"
  );

  if (!fs.existsSync(scriptPath)) {
    return {
      status: "review_required",
      filesReviewed: [],
      signalCount: 0,
      signals: [],
      operationalDiagnostic: {
        code: "AUDIT_SCRIPT_MISSING",
        message: "Maintainability audit script not found at expected location",
        file: ".agents/skills/frontend-maintainability-governance/scripts/audit-changed-code.mjs",
        line: 0,
        retryable: false,
      },
    };
  }

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [scriptPath, "--format=json", ...productFiles],
      {
        cwd: repoRoot,
        maxBuffer: 10 * 1024 * 1024,
      }
    );

    const parsed = JSON.parse(stdout.toString("utf8"));
    const filesReviewed = parsed.filesReviewed || productFiles;
    const allSignals = (parsed.signals || []).map((s) => ({
      id: s.id || `${s.rule}:${s.file}:${s.line}`,
      ...s,
    }));
    const signalCount = parsed.signalCount ?? allSignals.length;

    return {
      status: signalCount > 0 ? "review_required" : "clear",
      filesReviewed,
      signalCount,
      signals: allSignals.slice(0, 20),
    };
  } catch (error) {
    return {
      status: "review_required",
      filesReviewed: productFiles,
      signalCount: 0,
      signals: [],
      operationalDiagnostic: {
        code: "MAINTAINABILITY_EXECUTION_FAILED",
        message: `Failed to execute maintainability audit: ${error.message}`,
        retryable: false,
      },
    };
  }
}
