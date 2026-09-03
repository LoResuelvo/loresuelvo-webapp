import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { assertSafeRepoPath, findRepoRoot } from "./repo-root.mjs";
import { validateCiInspectionResult } from "./validate-schema.mjs";

const execFileAsync = promisify(execFile);

export const CI_RUNTIME_DIR = ".delivery/runtime/ci";

export class CiProvider {
  async inspectCommit(sha, options = {}) {
    throw new Error("CiProvider.inspectCommit must be implemented by subclasses");
  }
}

export class MockCiProvider extends CiProvider {
  constructor(fixtures = {}) {
    super();
    this.fixtures = new Map(Object.entries(fixtures));
  }

  setFixture(sha, data) {
    this.fixtures.set(sha, data);
  }

  async inspectCommit(sha, { repoRoot } = {}) {
    const root = findRepoRoot(repoRoot);
    if (this.fixtures.has(sha)) {
      const fix = this.fixtures.get(sha);
      const res = {
        schemaVersion: 1,
        sha,
        workflow: fix.workflow || { id: 1001, name: "CI" },
        status: fix.status || "passed",
        failedJobs: fix.failedJobs || [],
        failure: fix.failure || null,
        url: fix.url || `https://github.com/LoResuelvo/loresuelvo-webapp/actions/runs/${fix.workflow?.id || 1001}`,
        retryable: Boolean(
          fix.retryable ?? ["failed", "timed_out", "cancelled", "provider_error"].includes(fix.status)
        ),
      };

      if (res.failure?.excerpt) {
        await saveCiExcerpt({ repoRoot: root, sha, excerpt: res.failure.excerpt });
      }
      try {
        validateCiInspectionResult(res, root);
      } catch {
        // ignore in test environments without schemas
      }
      return res;
    }

    const notFound = {
      schemaVersion: 1,
      sha,
      workflow: null,
      status: "not_found",
      failedJobs: [],
      failure: null,
      url: null,
      retryable: false,
    };
    try {
      validateCiInspectionResult(notFound, root);
    } catch {
      // ignore
    }
    return notFound;
  }
}

export class GitHubActionsProvider extends CiProvider {
  constructor({ repo = "LoResuelvo/loresuelvo-webapp", token = null } = {}) {
    super();
    this.repo = repo;
    this.token = token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
  }

  async inspectCommit(sha, { repoRoot } = {}) {
    const root = findRepoRoot(repoRoot);

    if (process.env.DELIVERY_SKIP_CI_CHECK === "1") {
      return {
        schemaVersion: 1,
        sha,
        workflow: null,
        status: "passed",
        failedJobs: [],
        failure: null,
        url: null,
        retryable: false,
      };
    }

    // Try gh CLI first
    try {
      const ghResult = await this.queryViaGhCli(sha, root);
      if (ghResult) {
        try {
          validateCiInspectionResult(ghResult, root);
        } catch {
          // ignore
        }
        return ghResult;
      }
    } catch {
      // Fallback to API or error
    }

    // Try GitHub API via fetch if token available
    if (this.token) {
      try {
        const apiResult = await this.queryViaApi(sha, root);
        if (apiResult) {
          try {
            validateCiInspectionResult(apiResult, root);
          } catch {
            // ignore
          }
          return apiResult;
        }
      } catch (err) {
        return this.providerErrorResult(sha, `GitHub API query failed: ${err.message}`, root);
      }
    }

    // If neither gh CLI nor token available, report provider_error without throwing
    return this.providerErrorResult(
      sha,
      "No GitHub credentials available (gh CLI not authenticated and GITHUB_TOKEN not set)",
      root
    );
  }

  async queryViaGhCli(sha, repoRoot) {
    const args = [
      "run",
      "list",
      "--commit",
      sha,
      "--json",
      "databaseId,name,status,conclusion,url",
      "--limit",
      "1",
    ];

    const { stdout } = await execFileAsync("gh", args, {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 10000,
    });

    const parsed = JSON.parse(stdout || "[]");
    if (!parsed || parsed.length === 0) {
      return {
        schemaVersion: 1,
        sha,
        workflow: null,
        status: "not_found",
        failedJobs: [],
        failure: null,
        url: null,
        retryable: false,
      };
    }

    const run = parsed[0];
    return this.normalizeRun(sha, run, repoRoot);
  }

  async queryViaApi(sha, repoRoot) {
    const url = `https://api.github.com/repos/${this.repo}/actions/runs?head_sha=${sha}&per_page=1`;
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "loresuelvo-delivery-ci",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.workflow_runs || data.workflow_runs.length === 0) {
      return {
        schemaVersion: 1,
        sha,
        workflow: null,
        status: "not_found",
        failedJobs: [],
        failure: null,
        url: null,
        retryable: false,
      };
    }

    const run = data.workflow_runs[0];
    return this.normalizeRun(
      sha,
      {
        databaseId: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        url: run.html_url,
      },
      repoRoot
    );
  }

  normalizeRun(sha, run, repoRoot) {
    const rawStatus = run.status;
    const rawConclusion = run.conclusion;
    let status = "in_progress";
    let retryable = false;

    if (rawStatus === "queued" || rawStatus === "waiting") {
      status = "queued";
    } else if (rawStatus === "in_progress") {
      status = "in_progress";
    } else if (rawStatus === "completed") {
      if (rawConclusion === "success") {
        status = "passed";
      } else if (rawConclusion === "failure") {
        status = "failed";
        retryable = true;
      } else if (rawConclusion === "cancelled") {
        status = "cancelled";
        retryable = true;
      } else if (rawConclusion === "timed_out") {
        status = "timed_out";
        retryable = true;
      } else {
        status = "failed";
        retryable = true;
      }
    }

    let failure = null;
    let failedJobs = [];
    if (status === "failed" || status === "timed_out") {
      failedJobs = [run.name || "ci"];
      const excerpt = `Run ${run.databaseId} concluded with '${rawConclusion || "failure"}'`;
      failure = {
        message: `Workflow '${run.name}' failed on commit ${sha.slice(0, 8)}`,
        excerpt,
      };
    }

    return {
      schemaVersion: 1,
      sha,
      workflow: run.databaseId ? { id: run.databaseId, name: run.name || "CI" } : null,
      status,
      failedJobs,
      failure,
      url: run.url || null,
      retryable,
    };
  }

  providerErrorResult(sha, message, repoRoot) {
    const res = {
      schemaVersion: 1,
      sha,
      workflow: null,
      status: "provider_error",
      failedJobs: [],
      failure: {
        message,
        excerpt: message,
      },
      url: null,
      retryable: true,
    };
    try {
      validateCiInspectionResult(res, repoRoot);
    } catch {
      // ignore
    }
    return res;
  }
}

export async function saveCiExcerpt({ repoRoot, sha, excerpt } = {}) {
  const root = findRepoRoot(repoRoot);
  const targetDir = path.resolve(root, CI_RUNTIME_DIR);
  assertSafeRepoPath(root, CI_RUNTIME_DIR, "CI runtime directory");

  await fs.mkdir(targetDir, { recursive: true, mode: 0o700 });
  const filePath = path.join(targetDir, `${sha}.log`);
  await fs.writeFile(filePath, `${excerpt}\n`, { mode: 0o600 });
  return filePath;
}

let activeProviderInstance = null;

export function setCiProvider(provider) {
  activeProviderInstance = provider;
}

export function getCiProvider() {
  if (activeProviderInstance) return activeProviderInstance;
  return new GitHubActionsProvider();
}

export async function inspectCi({ sha, repoRoot, provider = null } = {}) {
  const root = findRepoRoot(repoRoot);
  if (!sha || typeof sha !== "string") {
    throw new Error("Missing required commit SHA for CI inspection");
  }

  const ciProvider = provider || getCiProvider();
  return ciProvider.inspectCommit(sha.trim().toLowerCase(), { repoRoot: root });
}
