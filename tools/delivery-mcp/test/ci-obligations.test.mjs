import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GitHubActionsProvider } from "../lib/ci-provider.mjs";
import { loadDeliveryPolicy } from "../lib/policy-loader.mjs";

const SHA = "a".repeat(40);
const REQUIRED = "CI Build & Test";
const JOBS = ["Lint & Unit Tests", "E2E Acceptance Tests", "Validar Imagen Docker"];

function run(id, name = REQUIRED, conclusion = "success", attempt = 1) {
  return {
    id, databaseId: id, name, head_sha: SHA, headSha: SHA, event: "push",
    run_attempt: attempt, runAttempt: attempt, status: "completed", conclusion,
    html_url: `https://github.com/example/runs/${id}`,
    url: `https://github.com/example/runs/${id}`,
  };
}

function jobs(conclusions = {}) {
  return JOBS.map((name, index) => ({
    id: index + 1, databaseId: index + 1, name, status: "completed",
    conclusion: conclusions[name] || "success", steps: [],
  }));
}

async function ghFixture(t, pages, jobsByRun = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ci-gh-obligations-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const fixturePath = path.join(directory, "fixture.json");
  await fs.writeFile(fixturePath, JSON.stringify({ pages, jobsByRun }));
  const script = `#!${process.execPath}\n` +
    `const f=require('fs'),x=JSON.parse(f.readFileSync(process.env.DELIVERY_CI_GH_FIXTURE,'utf8'));` +
    `const a=process.argv.slice(2).join(' '),m=a.match(/actions\\/runs\\/(\\d+)\\/jobs/);` +
    `if(a.includes('run list'))process.stdout.write(JSON.stringify(x.pages.flatMap(p=>p.workflow_runs)));` +
    `else if(m){const j=x.jobsByRun[m[1]]||[],p=Array.isArray(j[0])?j:[j];process.stdout.write(p.map(v=>JSON.stringify({jobs:v})).join('\\n'));}` +
    `else if(a.includes('run view')){const id=a.match(/run view (\\d+)/)?.[1];process.stdout.write(JSON.stringify({jobs:x.jobsByRun[id]||[]}));}` +
    `else process.stdout.write(x.pages.map(p=>JSON.stringify(p)).join('\\n'));\n`;
  await fs.writeFile(path.join(directory, "gh"), script, { mode: 0o755 });
  const oldPath = process.env.PATH;
  const oldFixture = process.env.DELIVERY_CI_GH_FIXTURE;
  process.env.PATH = `${directory}:${oldPath}`;
  process.env.DELIVERY_CI_GH_FIXTURE = fixturePath;
  t.after(() => {
    process.env.PATH = oldPath;
    if (oldFixture === undefined) delete process.env.DELIVERY_CI_GH_FIXTURE;
    else process.env.DELIVERY_CI_GH_FIXTURE = oldFixture;
  });
  return new GitHubActionsProvider({ token: null });
}

function restFixture(t, pages, jobsByRun = {}, hanging = null) {
  const oldFetch = globalThis.fetch;
  const provider = new GitHubActionsProvider({ token: "fixture-token" });
  provider.queryViaGhCli = async () => { throw new Error("CLI unavailable"); };
  let aborted = false;
  globalThis.fetch = async (url, options = {}) => {
    const parsed = new URL(url);
    const isJobs = parsed.pathname.endsWith("/jobs");
    const isAnnotations = parsed.pathname.endsWith("/annotations");
    if ((hanging === "runs" && !isJobs && !isAnnotations) ||
        (hanging === "jobs" && isJobs) ||
        (hanging === "annotations" && isAnnotations)) {
      return new Promise((_, reject) => {
        options.signal?.addEventListener("abort", () => {
          aborted = true;
          reject(new DOMException("aborted", "AbortError"));
        }, { once: true });
      });
    }
    if (isAnnotations) return response([], null);
    if (isJobs) {
      const id = parsed.pathname.match(/runs\/(\d+)\/jobs/)?.[1];
      const found = jobsByRun[id] || [];
      const pagesForJobs = Array.isArray(found[0]) ? found : [found];
      const page = Number(parsed.searchParams.get("page") || 1);
      const next = page < pagesForJobs.length
        ? `<https://api.github.com/repos/example/actions/runs/${id}/jobs?page=${page + 1}>; rel="next"`
        : null;
      return response({ jobs: pagesForJobs[page - 1] }, next);
    }
    const page = Number(parsed.searchParams.get("page") || 1);
    const next = page < pages.length
      ? `<https://api.github.com/repos/example/actions/runs?page=${page + 1}>; rel="next"`
      : null;
    return response(pages[page - 1], next);
  };
  t.after(() => { globalThis.fetch = oldFetch; });
  return { provider, wasAborted: () => aborted };
}

function response(body, link) {
  return { ok: true, status: 200, headers: { get: (key) => key.toLowerCase() === "link" ? link : null },
    json: async () => body };
}

for (const backend of ["gh", "rest"]) {
  async function providerFor(t, pages, jobsByRun = {}, hanging = null) {
    if (backend === "gh") return { provider: await ghFixture(t, pages, jobsByRun) };
    return restFixture(t, pages, jobsByRun, hanging);
  }

  for (const reversed of [false, true]) {
    test(`${backend}: workflow ajeno verde no oculta requerido fallido (${reversed ? "inverso" : "normal"})`, async (t) => {
      const required = run(10, REQUIRED, "failure");
      const unrelated = run(20, "Unrelated", "success");
      const runs = reversed ? [required, unrelated] : [unrelated, required];
      const { provider } = await providerFor(t, [{ workflow_runs: runs }], { 10: jobs({ [JOBS[0]]: "failure" }) });
      const result = await provider.inspectCommit(SHA);
      assert.equal(result.status, "failed");
      assert.equal(result.workflow.name, REQUIRED);
      assert.equal(result.requiredChecks.find((check) => check.name === JOBS[0])?.status, "failed");
    });
  }

  test(`${backend}: requerido ausente nunca es passed`, async (t) => {
    const { provider } = await providerFor(t, [{ workflow_runs: [run(20, "Unrelated")] }]);
    assert.equal((await provider.inspectCommit(SHA)).status, "not_found");
  });

  test(`${backend}: último run/reintento requerido decide sin depender del orden`, async (t) => {
    const latest = run(30, REQUIRED, "success", 2);
    const old = run(30, REQUIRED, "failure", 1);
    const { provider } = await providerFor(t, [{ workflow_runs: [old, latest] }], { 30: jobs() });
    const result = await provider.inspectCommit(SHA);
    assert.equal(result.status, "passed");
    assert.equal(result.workflow.name, REQUIRED);
  });

  test(`${backend}: un run más reciente fallido prevalece sobre uno viejo verde`, async (t) => {
    const { provider } = await providerFor(t,
      [{ workflow_runs: [run(80, REQUIRED, "failure"), run(70)] }],
      { 80: jobs({ [JOBS[1]]: "failure" }), 70: jobs() });
    assert.equal((await provider.inspectCommit(SHA)).status, "failed");
  });

  test(`${backend}: una segunda página contiene el workflow requerido`, async (t) => {
    const filler = Array.from({ length: 100 }, (_, i) => run(i + 100, "Unrelated"));
    const { provider } = await providerFor(t,
      [{ workflow_runs: filler }, { workflow_runs: [run(300)] }], { 300: jobs() });
    const result = await provider.inspectCommit(SHA);
    assert.equal(result.status, "passed");
    assert.equal(result.workflow.name, REQUIRED);
  });

  test(`${backend}: run requerido más nuevo en segunda página prevalece`, async (t) => {
    const first = [run(10), ...Array.from({ length: 99 }, (_, i) => run(i + 100, "Unrelated"))];
    const { provider } = await providerFor(t,
      [{ workflow_runs: first }, { workflow_runs: [run(300, REQUIRED, "failure")] }],
      { 10: jobs(), 300: jobs({ [JOBS[0]]: "failure" }) });
    assert.equal((await provider.inspectCommit(SHA)).status, "failed");
  });

  test(`${backend}: jobs obligatorios pueden estar en segunda página`, async (t) => {
    const filler = Array.from({ length: 100 }, (_, i) => ({
      id: i + 100, name: `Optional ${i}`, status: "completed", conclusion: "success",
    }));
    const { provider } = await providerFor(t, [{ workflow_runs: [run(51)] }],
      { 51: [filler, jobs()] });
    assert.equal((await provider.inspectCommit(SHA)).status, "passed");
  });

  test(`${backend}: jobs requeridos ausentes no producen passed`, async (t) => {
    const { provider } = await providerFor(t, [{ workflow_runs: [run(40)] }], { 40: jobs().slice(0, 2) });
    assert.equal((await provider.inspectCommit(SHA)).status, "not_found");
  });

  test(`${backend}: ausencia de job durante un run activo queda pendiente`, async (t) => {
    const active = { ...run(41), status: "in_progress", conclusion: null };
    const { provider } = await providerFor(t, [{ workflow_runs: [active] }], { 41: [] });
    assert.equal((await provider.inspectCommit(SHA)).status, "in_progress");
  });

  test(`${backend}: job requerido fallido bloquea aun si el workflow dice success`, async (t) => {
    const { provider } = await providerFor(t, [{ workflow_runs: [run(45)] }],
      { 45: jobs({ [JOBS[2]]: "failure" }) });
    assert.equal((await provider.inspectCommit(SHA)).status, "failed");
  });

  test(`${backend}: todos los requeridos verdes producen passed`, async (t) => {
    const { provider } = await providerFor(t, [{ workflow_runs: [run(50)] }], { 50: jobs() });
    const result = await provider.inspectCommit(SHA);
    assert.equal(result.status, "passed");
    assert.deepEqual(result.requiredChecks.map((check) => check.status), ["passed", "passed", "passed"]);
  });
}

test("REST: fetch de runs colgado se aborta dentro del deadline", async (t) => {
  const { provider, wasAborted } = restFixture(t, [{ workflow_runs: [] }], {}, "runs");
  const result = await Promise.race([
    provider.inspectCommit(SHA, { deadlineAt: Date.now() + 50 }),
    new Promise((resolve) => setTimeout(() => resolve("hung"), 500)),
  ]);
  assert.notEqual(result, "hung");
  assert.equal(result.status, "provider_error");
  assert.equal(result.retryable, true);
  assert.equal(wasAborted(), true);
});

test("REST: cuerpo JSON colgado también consume el deadline", async () => {
  let aborted = false;
  const provider = new GitHubActionsProvider({
    token: "fixture-token",
    execGh: async () => { throw new Error("CLI unavailable"); },
    fetchFn: (_url, { signal }) => {
      signal.addEventListener("abort", () => { aborted = true; }, { once: true });
      return Promise.resolve({ ok: true, headers: { get: () => null },
        json: () => new Promise(() => {}) });
    },
  });
  const result = await Promise.race([
    provider.inspectCommit(SHA, { deadlineAt: Date.now() + 50 }),
    new Promise((resolve) => setTimeout(() => resolve("hung"), 500)),
  ]);
  assert.notEqual(result, "hung");
  assert.equal(result.status, "provider_error");
  assert.equal(aborted, true);
});

test("REST: enriquecimiento de jobs colgado se aborta", async (t) => {
  const { provider, wasAborted } = restFixture(t, [{ workflow_runs: [run(60, REQUIRED, "failure")] }], {}, "jobs");
  const result = await Promise.race([
    provider.inspectCommit(SHA, { deadlineAt: Date.now() + 50 }),
    new Promise((resolve) => setTimeout(() => resolve("hung"), 500)),
  ]);
  assert.notEqual(result, "hung");
  assert.equal(result.status, "provider_error");
  assert.equal(result.retryable, true);
  assert.equal(wasAborted(), true);
});

test("REST: enriquecimiento de anotaciones colgado se aborta", async (t) => {
  const { provider, wasAborted } = restFixture(t,
    [{ workflow_runs: [run(61, REQUIRED, "failure")] }],
    { 61: jobs({ [JOBS[0]]: "failure" }) }, "annotations");
  const result = await Promise.race([
    provider.inspectCommit(SHA, { deadlineAt: Date.now() + 50 }),
    new Promise((resolve) => setTimeout(() => resolve("hung"), 500)),
  ]);
  assert.notEqual(result, "hung");
  assert.equal(result.status, "provider_error");
  assert.equal(wasAborted(), true);
});

test("GH CLI: comando colgado se cancela y devuelve provider_error", async () => {
  let aborted = false;
  const provider = new GitHubActionsProvider({
    token: null,
    execGh: (_command, _args, { signal }) => new Promise((_, reject) => {
      signal.addEventListener("abort", () => {
        aborted = true;
        reject(new DOMException("aborted", "AbortError"));
      }, { once: true });
    }),
  });
  const result = await Promise.race([
    provider.inspectCommit(SHA, { deadlineAt: Date.now() + 50 }),
    new Promise((resolve) => setTimeout(() => resolve("hung"), 500)),
  ]);
  assert.notEqual(result, "hung");
  assert.equal(result.status, "provider_error");
  assert.equal(result.retryable, true);
  assert.equal(aborted, true);
});

test("GH CLI: log de fallo colgado respeta el mismo deadline", async () => {
  let aborted = false;
  const provider = new GitHubActionsProvider({
    token: null,
    execGh: (_command, args, { signal }) => {
      const joined = args.join(" ");
      if (joined.includes("actions/runs/90/jobs")) return Promise.resolve({
        stdout: JSON.stringify([{ jobs: jobs({ [JOBS[0]]: "failure" }) }]),
      });
      if (joined.includes("actions/runs?")) return Promise.resolve({
        stdout: JSON.stringify([{ workflow_runs: [run(90, REQUIRED, "failure")] }]),
      });
      return new Promise((_, reject) => {
        signal.addEventListener("abort", () => {
          aborted = true;
          reject(new DOMException("aborted", "AbortError"));
        }, { once: true });
      });
    },
  });
  const result = await Promise.race([
    provider.inspectCommit(SHA, { deadlineAt: Date.now() + 50 }),
    new Promise((resolve) => setTimeout(() => resolve("hung"), 500)),
  ]);
  assert.notEqual(result, "hung");
  assert.equal(result.status, "provider_error");
  assert.equal(result.retryable, true);
  assert.equal(aborted, true);
});

test("política: identidad remota y jobs obligatorios son explícitos", async () => {
  const policy = await loadDeliveryPolicy();
  assert.deepEqual(policy.ci.requiredWorkflows, [{
    name: REQUIRED,
    event: "push",
    jobs: JOBS,
  }]);
});
