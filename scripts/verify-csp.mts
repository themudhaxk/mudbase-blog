/**
 * Guards the Content-Security-Policy-Report-Only header added to next.config.ts.
 *
 * Reads the config source as text so no Next.js build machinery is needed.
 * Verifies that the header key is present and that every required CSP directive
 * name appears in the value string. Run with: npm run verify:csp
 */
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, "..", "next.config.ts");

interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

async function run(): Promise<void> {
  const src = await readFile(configPath, "utf8");
  const results: CheckResult[] = [];

  // Check 1: header key is present
  results.push({
    name: "Content-Security-Policy-Report-Only key is declared",
    passed: src.includes("Content-Security-Policy-Report-Only"),
  });

  // Check 2: all required directive names are present in the source
  const requiredDirectives = [
    "default-src",
    "script-src",
    "style-src",
    "img-src",
    "font-src",
    "connect-src",
    "frame-src",
    "object-src",
    "base-uri",
    "form-action",
    "frame-ancestors",
  ];

  for (const directive of requiredDirectives) {
    results.push({
      name: `directive present: ${directive}`,
      passed: src.includes(`"${directive} `),
    });
  }

  // Check 3: no report-uri or report-to (no reporting endpoint exists for the blog)
  const cspBlock = src.match(/cspReportOnly\s*=\s*\[[\s\S]*?\.join/)?.[0] ?? "";
  results.push({
    name: "no report-uri or report-to (none configured)",
    passed: !cspBlock.includes("report-uri") && !cspBlock.includes("report-to"),
  });

  // Check 4: enforced headers are untouched (X-Frame-Options DENY still present)
  results.push({
    name: 'enforced X-Frame-Options DENY is unchanged',
    passed: src.includes(`{ key: "X-Frame-Options", value: "DENY" }`),
  });

  // Report results
  let failures = 0;
  for (const r of results) {
    const symbol = r.passed ? "ok" : "FAIL";
    console.log(`  [${symbol}] ${r.name}${r.detail ? ": " + r.detail : ""}`);
    if (!r.passed) failures++;
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\nAll ${results.length} checks passed.`);
  }
}

run().catch((err) => {
  console.error("verify:csp error:", err);
  process.exit(1);
});
