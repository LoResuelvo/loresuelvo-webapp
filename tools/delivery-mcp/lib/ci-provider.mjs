import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { assertSafeRepoPath, findRepoRoot } from "./repo-root.mjs";
import { validateCiInspectionResult } from "./validate-schema.mjs";
import { redactSecrets } from "./redact-secrets.mjs";
import { summarizeFailureOutput } from "./execute-check.mjs";
import { loadDeliveryPolicy } from "./policy-loader.mjs";
import { selectRequiredRuns, aggregateRequiredCi, normalizeCiStatus } from "./ci-obligations.mjs";

const execFileAsync = promisify(execFile);

function parseGhPages(output) {
  const pages = [];
  let start = -1;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < output.length; index++) {
    const char = output[index];
    if (start < 0) {
      if (/\s/.test(char)) continue;
      if (char !== "{" && char !== "[") throw new Error("Invalid GitHub CLI pagination response");
      start = index;
    }
    if (escaped) { escaped = false; continue; }
    if (char === "\\" && quoted) { escaped = true; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (quoted) continue;
    if (char === "{" || char === "[") depth++;
    if (char === "}" || char === "]") depth--;
    if (depth < 0) throw new Error("Invalid GitHub CLI pagination response");
    if (depth === 0) {
      const value = JSON.parse(output.slice(start, index + 1));
      pages.push(...(Array.isArray(value) ? value : [value]));
      start = -1;
    }
  }
  if (start >= 0 || quoted || pages.length === 0) {
    throw new Error("Incomplete GitHub CLI pagination response");
  }
  return pages;
}

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
      validateCiInspectionResult(res, root);
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
    validateCiInspectionResult(notFound, root);
    return notFound;
  }
}

export class GitHubActionsProvider extends CiProvider {
  constructor({ repo = "LoResuelvo/loresuelvo-webapp", token = null, execGh = execFileAsync, fetchFn = null } = {}) {
    super();
    this.repo = repo;
    this.token = token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
    this.execGh = execGh;
    this.fetchFn = fetchFn || ((...args) => globalThis.fetch(...args));
  }

  async inspectCommit(sha, { repoRoot, deadlineAt = Date.now() + 20000 } = {}) {
    const root = findRepoRoot(repoRoot);
    const policy = await loadDeliveryPolicy({ repoRoot: root });
    const requiredWorkflows = policy.ci.requiredWorkflows;

    // Try gh CLI first
    let ghResult = null;
    try {
      ghResult = await this.queryViaGhCli(sha, root, requiredWorkflows, deadlineAt);
    } catch (error) {
      if (error.code === "CI_PROVIDER_TIMEOUT") {
        return this.providerErrorResult(sha, error.message, root);
      }
      // Fall back to the API when gh is unavailable or unauthenticated.
    }
    if (ghResult) {
      validateCiInspectionResult(ghResult, root);
      return ghResult;
    }

    // Try GitHub API via fetch if token available
    if (this.token) {
      try {
        const apiResult = await this.queryViaApi(sha, root, requiredWorkflows, deadlineAt);
        if (apiResult) {
          validateCiInspectionResult(apiResult, root);
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

  async withDeadline(deadlineAt, operation) {
    const remaining = deadlineAt - Date.now();
    if (remaining <= 0) {
      const error = new Error("CI provider deadline exceeded");
      error.code = "CI_PROVIDER_TIMEOUT";
      throw error;
    }
    const controller = new AbortController();
    let timer;
    try {
      return await Promise.race([
        operation(controller.signal, remaining),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            const error = new Error("CI provider deadline exceeded");
            error.code = "CI_PROVIDER_TIMEOUT";
            reject(error);
          }, remaining);
        }),
      ]);
    } catch (error) {
      if (controller.signal.aborted && error.code !== "CI_PROVIDER_TIMEOUT") {
        const timeout = new Error("CI provider deadline exceeded");
        timeout.code = "CI_PROVIDER_TIMEOUT";
        throw timeout;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async ghJson(endpoint, repoRoot, deadlineAt) {
    const { stdout } = await this.withDeadline(deadlineAt, (signal, remaining) =>
      this.execGh("gh", ["api", "--paginate", endpoint], {
        cwd: repoRoot, encoding: "utf8", signal,
        timeout: remaining, maxBuffer: 20 * 1024 * 1024,
      }));
    return parseGhPages(stdout || "");
  }

  async fetchJson(url, deadlineAt) {
    return this.withDeadline(deadlineAt, async (signal) => {
      const response = await this.fetchFn(url, {
        signal,
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "loresuelvo-delivery-ci",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return {
        data: await response.json(),
        next: response.headers?.get("link")?.match(/<([^>]+)>;\s*rel="next"/)?.[1] || null,
      };
    });
  }

  async restPages(url, key, deadlineAt) {
    const pages = [];
    for (let page = 0; page < 1000; page++) {
      const response = await this.fetchJson(url, deadlineAt);
      const items = response.data?.[key];
      if (!Array.isArray(items)) throw new Error(`Invalid GitHub API ${key} response`);
      pages.push(...items);
      if (!response.next) return pages;
      url = response.next;
    }
    throw new Error("GitHub API pagination limit exceeded");
  }

  async queryViaGhCli(sha, repoRoot, requirements, deadlineAt) {
    const pages = await this.ghJson(`repos/${this.repo}/actions/runs?head_sha=${sha}&per_page=100`, repoRoot, deadlineAt);
    const runs = pages.flatMap((page) => page.workflow_runs || []);
    const selected = selectRequiredRuns(runs, requirements, sha);
    const resolved = await Promise.all(selected.map(async ({ requirement, run }) => ({
      requirement, run,
      jobs: run ? (await this.ghJson(`repos/${this.repo}/actions/runs/${run.id ?? run.databaseId}/jobs?filter=latest&per_page=100`, repoRoot, deadlineAt))
        .flatMap((page) => page.jobs || []) : [],
    })));
    const result = aggregateRequiredCi(sha, resolved);
    const selectedJobs = resolved.find(({ run }) =>
      Number(run?.id ?? run?.databaseId) === result.workflow?.id)?.jobs || [];
    return ["failed", "timed_out"].includes(result.status)
      ? this.enrichFailureViaGh(result, repoRoot, deadlineAt, selectedJobs) : result;
  }

  async queryViaApi(sha, repoRoot, requirements, deadlineAt) {
    const runs = await this.restPages(
      `https://api.github.com/repos/${this.repo}/actions/runs?head_sha=${sha}&per_page=100`,
      "workflow_runs", deadlineAt
    );
    const selected = selectRequiredRuns(runs, requirements, sha);
    const resolved = await Promise.all(selected.map(async ({ requirement, run }) => ({
      requirement, run,
      jobs: run ? await this.restPages(
        `https://api.github.com/repos/${this.repo}/actions/runs/${run.id ?? run.databaseId}/jobs?filter=latest&per_page=100`,
        "jobs", deadlineAt
      ) : [],
    })));
    const result = aggregateRequiredCi(sha, resolved);
    const selectedJobs = resolved.find(({ run }) =>
      Number(run?.id ?? run?.databaseId) === result.workflow?.id)?.jobs || [];
    return ["failed", "timed_out"].includes(result.status)
      ? this.enrichFailureViaApi(result, repoRoot, deadlineAt, selectedJobs) : result;
  }

  failureFromJobs(jobs = []) {
    const failingConclusions = new Set([
      "failure",
      "timed_out",
      "cancelled",
      "action_required",
      "startup_failure",
    ]);
    const failedJobs = jobs.filter((job) => failingConclusions.has(job.conclusion));
    if (failedJobs.length === 0) return null;

    const firstJob = failedJobs[0];
    const firstStep = (firstJob.steps || []).find((step) =>
      failingConclusions.has(step.conclusion)
    );
    const message = firstStep
      ? `Job '${firstJob.name}' failed at step '${firstStep.name}'`
      : `Job '${firstJob.name}' failed`;
    const excerpt = [
      `Job: ${firstJob.name}`,
      ...(firstStep ? [`Step: ${firstStep.name}`] : []),
      `Conclusion: ${firstStep?.conclusion || firstJob.conclusion || "failure"}`,
    ].join("\n");

    return {
      failedJobs: failedJobs.map((job) => job.name || `job-${job.databaseId || job.id}`),
      firstJobId: firstJob.databaseId || firstJob.id || null,
      failure: { message, excerpt },
    };
  }

  async enrichFailureViaGh(result, repoRoot, deadlineAt, jobs) {
    try {
      const runId = String(result.workflow.id);
      const details = this.failureFromJobs(jobs);
      if (!details) return result;

      let excerpt = details.failure.excerpt;
      if (details.firstJobId) {
        try {
          const logResult = await this.withDeadline(deadlineAt, (signal, remaining) =>
            this.execGh("gh", ["run", "view", runId, "--job", String(details.firstJobId), "--log-failed"], {
              cwd: repoRoot, encoding: "utf8", signal,
              timeout: remaining, maxBuffer: 2 * 1024 * 1024,
            }));
          const lines = summarizeFailureOutput(logResult.stdout, 6);
          if (lines.length > 0) excerpt = lines.join("\n");
        } catch (error) {
          if (error.code === "CI_PROVIDER_TIMEOUT") throw error;
          // Job and step metadata still provide a bounded diagnostic.
        }
      }

      const enriched = {
        ...result,
        failedJobs: details.failedJobs,
        failure: { ...details.failure, excerpt: redactSecrets(excerpt) },
      };
      await saveCiExcerpt({ repoRoot, sha: result.sha, excerpt: enriched.failure.excerpt });
      return enriched;
    } catch (error) {
      if (error.code === "CI_PROVIDER_TIMEOUT") throw error;
      return result;
    }
  }

  async enrichFailureViaApi(result, repoRoot, deadlineAt, jobs) {
    try {
      const details = this.failureFromJobs(jobs);
      if (!details) return result;

      let excerpt = details.failure.excerpt;
      if (details.firstJobId) {
        const annotationsUrl = `https://api.github.com/repos/${this.repo}/check-runs/${details.firstJobId}/annotations?per_page=10`;
        const { data: annotations } = await this.fetchJson(annotationsUrl, deadlineAt);
        const lines = annotations
          .filter((annotation) => annotation.annotation_level === "failure")
          .slice(0, 6)
          .map((annotation) =>
            `${annotation.path || "CI"}${annotation.start_line ? `:${annotation.start_line}` : ""}: ${annotation.message || annotation.title || "failure"}`
          );
        if (lines.length > 0) excerpt = lines.join("\n");
      }

      const enriched = {
        ...result,
        failedJobs: details.failedJobs,
        failure: { ...details.failure, excerpt: redactSecrets(excerpt) },
      };
      await saveCiExcerpt({ repoRoot, sha: result.sha, excerpt: enriched.failure.excerpt });
      return enriched;
    } catch (error) {
      if (error.code === "CI_PROVIDER_TIMEOUT") throw error;
      return result;
    }
  }

  normalizeRun(sha, run, repoRoot) {
    const rawStatus = run.status;
    const rawConclusion = run.conclusion;
    const status = normalizeCiStatus(rawStatus, rawConclusion);
    const retryable = ["failed", "timed_out", "cancelled"].includes(status);

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
    const safeMessage = redactSecrets(String(message || "CI provider unavailable")).split("\n")[0];
    const res = {
      schemaVersion: 1,
      sha,
      workflow: null,
      status: "provider_error",
      failedJobs: [],
      failure: {
        message: safeMessage,
        excerpt: safeMessage,
      },
      url: null,
      retryable: true,
    };
    validateCiInspectionResult(res, repoRoot);
    return res;
  }
}

export async function saveCiExcerpt({ repoRoot, sha, excerpt } = {}) {
  const root = findRepoRoot(repoRoot);
  const targetDir = path.resolve(root, CI_RUNTIME_DIR);
  assertSafeRepoPath(root, CI_RUNTIME_DIR, "CI runtime directory");

  await fs.mkdir(targetDir, { recursive: true, mode: 0o700 });
  const filePath = path.join(targetDir, `${sha}.log`);
  const safeExcerpt = redactSecrets(String(excerpt || "")).slice(0, 20000);
  await fs.writeFile(filePath, `${safeExcerpt}\n`, { mode: 0o600 });
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

export async function inspectCi({ sha, repoRoot, provider = null, deadlineAt } = {}) {
  const root = findRepoRoot(repoRoot);
  if (!sha || typeof sha !== "string") {
    throw new Error("Missing required commit SHA for CI inspection");
  }

  const ciProvider = provider || getCiProvider();
  return ciProvider.inspectCommit(sha.trim().toLowerCase(), { repoRoot: root, deadlineAt });
}
