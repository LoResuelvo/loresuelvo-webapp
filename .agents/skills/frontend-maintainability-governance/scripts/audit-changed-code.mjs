import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const DEFAULT_THRESHOLDS = {
  fileLines: 250,
  functionLines: 60,
  mainBodyLines: 120,
  useState: 5,
  useRef: 5,
  useCallback: 6,
  useEffect: 3,
};

function loadThresholds() {
  const policyPath = path.resolve(".delivery/policy.v1.json");
  if (fs.existsSync(policyPath)) {
    try {
      const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
      if (policy && policy.maintainabilityThresholds) {
        return { ...DEFAULT_THRESHOLDS, ...policy.maintainabilityThresholds };
      }
    } catch {
      // Fallback to default thresholds
    }
  }
  return DEFAULT_THRESHOLDS;
}

const THRESHOLDS = loadThresholds();

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const EXCLUDED_PARTS = new Set([".agents", ".next", "node_modules", "reports", ".cucumber-dist", ".delivery", ".codex", "tools"]);
const TEST_FILE_PATTERN = /(?:^|\/)(?:features\/|.*\.(?:test|spec)\.[cm]?[jt]sx?$)/;

function usage() {
  console.log(`Uso:
  node audit-changed-code.mjs [--format=human|json] <archivo> [archivo...]

Obtené antes las rutas con git diff --name-only y pasá únicamente fuentes
productivas TypeScript/JavaScript. Las señales no producen un exit code de falla.`);
}

function parseArgs(argv) {
  const files = [];
  let format = "human";

  for (const value of argv) {
    if (value === "--help" || value === "-h") return { help: true, files, format };
    if (value === "--format=json") {
      format = "json";
      continue;
    }
    if (value === "--format=human") {
      format = "human";
      continue;
    }
    if (value.startsWith("-")) throw new Error(`Opción desconocida: ${value}`);
    files.push(value);
  }

  return { help: false, files, format };
}

function isProductSource(file) {
  const normalized = file.split(path.sep).join("/");
  const parts = normalized.split("/");
  const extension = path.extname(normalized);

  return (
    SOURCE_EXTENSIONS.has(extension) &&
    !normalized.endsWith(".d.ts") &&
    !TEST_FILE_PATTERN.test(normalized) &&
    !parts.some((part) => EXCLUDED_PARTS.has(part))
  );
}

function functionName(node, sourceFile, line) {
  if (node.name && ts.isIdentifier(node.name)) return node.name.text;
  if (node.name) return node.name.getText(sourceFile);

  const parent = node.parent;
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
  if (ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent)) {
    return parent.name.getText(sourceFile);
  }

  return `<callback@${line}>`;
}

function isFunctionLike(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

function calledHookName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "React"
  ) {
    return expression.name.text;
  }
  return null;
}

function hookCounts(body) {
  const counts = { useState: 0, useRef: 0, useCallback: 0, useEffect: 0 };

  function visit(node) {
    if (node !== body && isFunctionLike(node)) return;
    if (ts.isCallExpression(node)) {
      const name = calledHookName(node.expression);
      if (name && Object.hasOwn(counts, name)) counts[name] += 1;
    }
    ts.forEachChild(node, visit);
  }

  visit(body);
  return counts;
}

function inspectFile(relativeFile) {
  const absoluteFile = path.resolve(relativeFile);
  const sourceText = fs.readFileSync(absoluteFile, "utf8");
  const sourceFile = ts.createSourceFile(
    relativeFile,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  const findings = [];
  const signals = [];
  const fileLines = sourceText.split(/\r?\n/).length;

  if (fileLines > THRESHOLDS.fileLines) {
    const msg = `archivo: ${fileLines} líneas (>${THRESHOLDS.fileLines})`;
    findings.push({
      line: 1,
      count: 1,
      message: msg,
    });
    signals.push({
      rule: "fileLines",
      file: relativeFile,
      line: 1,
      observed: fileLines,
      threshold: THRESHOLDS.fileLines,
      message: msg,
    });
  }

  function visit(node) {
    if (isFunctionLike(node) && node.body) {
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      const end = sourceFile.getLineAndCharacterOfPosition(node.end).line + 1;
      const lines = end - start + 1;
      const name = functionName(node, sourceFile, start);
      const isHook = /^use[A-Z]/.test(name);
      const isComponent = /^[A-Z]/.test(name);
      const nodeSignals = [];

      if (lines > THRESHOLDS.functionLines) {
        const msg = `${lines} líneas (>${THRESHOLDS.functionLines})`;
        nodeSignals.push(msg);
        signals.push({
          rule: "functionLines",
          file: relativeFile,
          line: start,
          observed: lines,
          threshold: THRESHOLDS.functionLines,
          message: `${name}: ${msg}`,
        });
      }
      if ((isHook || isComponent) && lines > THRESHOLDS.mainBodyLines) {
        const msg = `${isHook ? "hook" : "componente"} principal >${THRESHOLDS.mainBodyLines}`;
        nodeSignals.push(msg);
        signals.push({
          rule: "mainBodyLines",
          file: relativeFile,
          line: start,
          observed: lines,
          threshold: THRESHOLDS.mainBodyLines,
          message: `${name}: ${msg}`,
        });
      }

      if (isHook || isComponent) {
        const counts = hookCounts(node.body);
        for (const hook of ["useState", "useRef", "useCallback", "useEffect"]) {
          if (counts[hook] > THRESHOLDS[hook]) {
            const msg = `${hook}=${counts[hook]} (>${THRESHOLDS[hook]})`;
            nodeSignals.push(msg);
            signals.push({
              rule: hook,
              file: relativeFile,
              line: start,
              observed: counts[hook],
              threshold: THRESHOLDS[hook],
              message: `${name}: ${msg}`,
            });
          }
        }
      }

      if (nodeSignals.length > 0) {
        findings.push({
          line: start,
          count: nodeSignals.length,
          message: `${name}: ${nodeSignals.join("; ")}`,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { findings, signals };
}

function existingProductFiles(files) {
  const missing = [];
  const valid = [];
  const repoRoot = path.resolve(".");

  for (const file of files) {
    const absoluteFile = path.resolve(file);
    const relativeToRepo = path.relative(repoRoot, absoluteFile);
    if (relativeToRepo.startsWith("..") || path.isAbsolute(relativeToRepo)) {
      throw new Error(`Archivo fuera del repositorio no permitido: ${file}`);
    }

    if (!fs.existsSync(absoluteFile) || !fs.statSync(absoluteFile).isFile()) {
      missing.push(file);
      continue;
    }
    if (isProductSource(file)) valid.push(file);
  }

  if (missing.length > 0) {
    throw new Error(`No se encontraron: ${missing.join(", ")}`);
  }
  return [...new Set(valid)].sort();
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  if (options.files.length === 0) {
    usage();
    throw new Error("se requiere al menos un archivo productivo");
  }

  const files = existingProductFiles(options.files);

  if (files.length === 0) {
    if (options.format === "json") {
      console.log(JSON.stringify({ filesReviewed: [], signalCount: 0, signals: [] }));
    } else {
      console.log("Mantenibilidad: no hay archivos productivos TypeScript/JavaScript para revisar.");
    }
    return;
  }

  const reviewed = files.map((file) => {
    const { findings, signals } = inspectFile(file);
    return { file, findings, signals };
  });

  const allSignals = reviewed.flatMap((r) => r.signals);
  const signalCount = allSignals.length;

  if (options.format === "json") {
    console.log(
      JSON.stringify(
        {
          filesReviewed: files,
          signalCount,
          signals: allSignals,
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`Mantenibilidad: ${files.length} archivo(s) revisado(s); ${signalCount} señal(es).`);

  for (const result of reviewed) {
    if (result.findings.length === 0) continue;
    console.log(`\n${result.file}`);
    for (const finding of result.findings) {
      console.log(`  L${finding.line}: ${finding.message}`);
    }
  }

  if (signalCount > 0) {
    console.log("\nLas señales exigen revisión, no una división automática. Refactorizar o justificar cada una.");
  }
}

try {
  main();
} catch (error) {
  console.error(`No se pudo auditar mantenibilidad: ${error.message}`);
  process.exitCode = 1;
}
