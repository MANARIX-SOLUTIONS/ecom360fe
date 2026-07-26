#!/usr/bin/env node
/**
 * Fails CI if Vite dist JS chunks exceed budgets (raw bytes).
 * Run after `npm run build`. Budgets gate regressions; antd ~1.1MB is expected.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST_ASSETS = join(process.cwd(), "dist", "assets");
const KB = 1024;

/** Max raw size per chunk name pattern (first match wins). */
const CHUNK_BUDGETS_KB = [
  { match: /vendor-antd/, maxKb: 1200 },
  { match: /vendor-charts/, maxKb: 450 },
  { match: /vendor-react/, maxKb: 200 },
  { match: /vendor-icons/, maxKb: 120 },
  { match: /xlsx/, maxKb: 450 },
  { match: /\.js$/, maxKb: 600 },
];

const TOTAL_JS_BUDGET_KB = 2800;

function budgetFor(fileName) {
  for (const rule of CHUNK_BUDGETS_KB) {
    if (rule.match.test(fileName)) return rule.maxKb;
  }
  return null;
}

function main() {
  let files;
  try {
    files = readdirSync(DIST_ASSETS).filter((f) => f.endsWith(".js"));
  } catch {
    console.error(`Missing ${DIST_ASSETS}. Run \`npm run build\` first.`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error("No JS assets found in dist/assets.");
    process.exit(1);
  }

  let totalBytes = 0;
  const violations = [];
  const rows = [];

  for (const file of files.sort()) {
    const bytes = statSync(join(DIST_ASSETS, file)).size;
    totalBytes += bytes;
    const sizeKb = bytes / KB;
    const maxKb = budgetFor(file);
    const ok = maxKb == null || sizeKb <= maxKb;
    rows.push({
      file,
      sizeKb: sizeKb.toFixed(1),
      maxKb: maxKb ?? "—",
      ok: ok ? "ok" : "FAIL",
    });
    if (!ok) {
      violations.push(
        `${file}: ${sizeKb.toFixed(1)} KB > ${maxKb} KB budget`
      );
    }
  }

  const totalKb = totalBytes / KB;
  console.log("Bundle budgets (raw JS in dist/assets):\n");
  console.table(rows);
  console.log(`Total JS: ${totalKb.toFixed(1)} KB (budget ${TOTAL_JS_BUDGET_KB} KB)`);

  if (totalKb > TOTAL_JS_BUDGET_KB) {
    violations.push(
      `total JS: ${totalKb.toFixed(1)} KB > ${TOTAL_JS_BUDGET_KB} KB`
    );
  }

  if (violations.length > 0) {
    console.error("\nBudget violations:");
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }

  console.log("\nAll chunk budgets passed.");
}

main();
