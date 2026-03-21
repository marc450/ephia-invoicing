/**
 * check-imports.mjs
 * Scans all src/components files + App.jsx for:
 * 1. Usage of known globals (helpers, constants, etc.) without imports
 * 2. JSX component usage (<ComponentName>) without a corresponding import
 *
 * Run: node scripts/check-imports.mjs
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = new URL("../src", import.meta.url).pathname;

// Symbols that must be imported if used in a component file
const HELPERS = [
  "fmt", "fmtDate", "fmtPhone", "parseDE", "evalAmount", "fmtUnits",
  "buildLineItems", "calcWeightedForGesamt", "calcGesamt", "calcGoaBetrag",
  "parsePlzOrt", "combinePlzOrt", "nextInvoiceNumber", "toDE", "flashOrtField",
];
const CONSTANTS = [
  "FACE_IMAGE_B64", "ZUSCHLAEGE", "DEFAULT_PRACTICE", "AUTO_LOGOUT_MS",
  "PUNKTWERT", "BOTOX_GOA_ITEMS", "SACHKOSTEN_INFO", "ICD10_CODES",
];
const CONSENT = ["CONSENT_TEMPLATES"];
const UI = ["spawnConfetti"];

const ALL_SYMBOLS = [
  ...HELPERS.map(s => ({ name: s, from: "utils/helpers" })),
  ...CONSTANTS.map(s => ({ name: s, from: "constants/index" })),
  ...CONSENT.map(s => ({ name: s, from: "components/consent/consentTemplates" })),
  ...UI.map(s => ({ name: s, from: "components/ui/ConfettiBurst" })),
];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (full.endsWith(".jsx") || full.endsWith(".js")) files.push(full);
  }
  return files;
}

const componentFiles = [
  ...walk(join(ROOT, "components")),
  join(ROOT, "App.jsx"),
];
let errors = 0;

for (const file of componentFiles) {
  const src = readFileSync(file, "utf8");
  const rel = relative(ROOT + "/..", file);
  const importBlock = src.split("\n").filter(l => l.startsWith("import")).join("\n");

  for (const { name, from } of ALL_SYMBOLS) {
    // Skip the file that defines this symbol
    const relForward = rel.replace(/\\/g, "/");
    if (relForward.includes(from.replace("constants/index", "constants"))) continue;
    const used = new RegExp(`\\b${name}\\b`).test(src);
    const imported = importBlock.includes(name);
    if (used && !imported) {
      console.error(`❌  ${rel}: uses '${name}' but doesn't import it (from src/${from})`);
      errors++;
    }
  }
}

// Check 2: JSX component usage without import
for (const file of componentFiles) {
  const src = readFileSync(file, "utf8");
  const rel = relative(ROOT + "/..", file);

  // Collect all imported names from import lines
  const importedNames = new Set(["React"]); // React is always available
  for (const line of src.split("\n").filter(l => l.startsWith("import"))) {
    const m = line.match(/import\s+(\w+)?\s*,?\s*(?:\{([^}]+)\})?/);
    if (m && m[1]) importedNames.add(m[1]);
    if (m && m[2]) m[2].split(",").forEach(s => importedNames.add(s.trim().split(/\s+as\s+/)[0].trim()));
  }

  // Find JSX component usages (uppercase tags)
  const jsxUsages = [...src.matchAll(/<([A-Z][A-Za-z0-9.]*)/g)].map(m => m[1].split(".")[0]);
  const unique = [...new Set(jsxUsages)];

  // Collect locally-defined/declared uppercase names (components, params, vars)
  const localDefs = new Set();
  for (const m of src.matchAll(/(?:const|function|class)\s+([A-Z][A-Za-z0-9]+)/g)) {
    localDefs.add(m[1]);
  }
  // Also collect function parameters that start with uppercase (used as JSX components)
  for (const m of src.matchAll(/\(([^)]*)\)/g)) {
    for (const param of m[1].split(",")) {
      const p = param.trim().split(/[\s=]/)[0];
      if (/^[A-Z]/.test(p)) localDefs.add(p);
    }
  }

  for (const name of unique) {
    if (importedNames.has(name) || localDefs.has(name)) continue;
    console.error(`❌  ${rel}: uses <${name}> but doesn't import it`);
    errors++;
  }
}

if (errors === 0) {
  console.log("✅  All symbols are properly imported.");
} else {
  console.log(`\n${errors} missing import(s) found.`);
  process.exit(1);
}
