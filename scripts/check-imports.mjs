/**
 * check-imports.mjs
 * Scans all src/components files for usages of known globals (helpers, constants, etc.)
 * that must be explicitly imported. Reports any that are missing.
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

if (errors === 0) {
  console.log("✅  All symbols are properly imported.");
} else {
  console.log(`\n${errors} missing import(s) found.`);
  process.exit(1);
}
