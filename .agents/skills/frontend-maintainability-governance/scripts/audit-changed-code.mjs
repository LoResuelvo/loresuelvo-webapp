import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const THRESHOLDS = {
  fileLines: 250,
  functionLines: 60,
  mainBodyLines: 120,
  useState: 5,
  useRef: 5,
  useCallback: 6,
  useEffect: 3,
};

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const EXCLUDED_PARTS = new Set([".agents", ".next", "node_modules", "reports", ".cucumber-dist"]);
const TEST_FILE_PATTERN = /(?:^|\/)(?:features\/|.*\.(?:test|spec)\.[cm]?[jt]sx?$)/;

function usage() {
  console.log(`Uso:
  node audit-changed-code.mjs <archivo> [archivo...]

Obtené antes las rutas con git diff --name-only y pasá únicamente fuentes
productivas TypeScript/JavaScript. Las señales no producen un exit code de falla.`);
}

function parseArgs(argv) {
  const files = [];

  for (const value of argv) {
    if (value === "--help" || value === "-h") return { help: true, files };
    if (value.startsWith("-")) throw new Error(`Opción desconocida: ${value}`);
    files.push(value);
  }

  return { help: false, files };
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
  const fileLines = sourceText.split(/\r?\n/).length;

  if (fileLines > THRESHOLDS.fileLines) {
    findings.push({
      line: 1,
      count: 1,
      message: `archivo: ${fileLines} líneas (>${THRESHOLDS.fileLines})`,
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
      const signals = [];

      if (lines > THRESHOLDS.functionLines) {
        signals.push(`${lines} líneas (>${THRESHOLDS.functionLines})`);
      }
      if ((isHook || isComponent) && lines > THRESHOLDS.mainBodyLines) {
        signals.push(`${isHook ? "hook" : "componente"} principal >${THRESHOLDS.mainBodyLines}`);
      }

      if (isHook || isComponent) {
        const counts = hookCounts(node.body);
        for (const hook of ["useState", "useRef", "useCallback", "useEffect"]) {
          if (counts[hook] > THRESHOLDS[hook]) {
            signals.push(`${hook}=${counts[hook]} (>${THRESHOLDS[hook]})`);
          }
        }
      }

      if (signals.length > 0) {
        findings.push({
          line: start,
          count: signals.length,
          message: `${name}: ${signals.join("; ")}`,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

function existingProductFiles(files) {
  const missing = [];
  const valid = [];

  for (const file of files) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
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
    console.log("Mantenibilidad: no hay archivos productivos TypeScript/JavaScript para revisar.");
    return;
  }

  const reviewed = files.map((file) => ({ file, findings: inspectFile(file) }));
  const signalCount = reviewed.reduce(
    (total, result) =>
      total + result.findings.reduce((subtotal, finding) => subtotal + finding.count, 0),
    0
  );
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
