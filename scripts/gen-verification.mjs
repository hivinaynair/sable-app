// Builds docs/verification.json from test titles that start with a journey rule ID,
// e.g. it("J5.S2.c1 ..."). Run after adding or renaming tests.
// --check compares the saved links with current titles without rewriting them.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseJourneys } from "../.agents/skills/journeys/scripts/journeys.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const docs = join(root, "docs");
const { spec, errors } = parseJourneys(readFileSync(join(docs, "journeys/thin-flow.md"), "utf8"));
if (errors.length) throw new Error(errors.join("\n"));
const active = new Set([
  ...spec.invariants.map((i) => i.id),
  ...spec.journeys.flatMap((j) => j.steps.flatMap((s) => s.criteria.map(([c]) => `${s.id}.${c}`))),
]);
const retired = new Set(spec.retired);
const title = /\bit(?:\.each<[^>]*>\([^)]*\))?\(\s*"((?:J\d+\.S\d+\.c\d+|I\d+)\b[^"]*)"/g;

function* testFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === "node_modules") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* testFiles(path);
    else if (entry.name.endsWith(".test.ts")) yield path;
  }
}

const map = {};
for (const name of ["packages", "apps"]) {
  const dir = join(root, name);
  // apps is absent until the web and agent packages are built.
  if (name === "apps" && !existsSync(dir)) continue;
  for (const file of testFiles(dir)) {
    for (const [, name] of readFileSync(file, "utf8").matchAll(title)) {
      const id = name.split(" ")[0];
      if (!active.has(id) && !retired.has(id)) throw new Error(`Test references unknown rule ${id}: ${file}`);
      (map[id] ??= []).push({ path: relative(docs, file), locator: name });
    }
  }
}

const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })));
const output = JSON.stringify(sorted, null, 2) + "\n";
const path = join(docs, "verification.json");
if (process.argv.includes("--check")) {
  if (readFileSync(path, "utf8") !== output) throw new Error("Verification links are stale; run bun run spec:links");
} else {
  writeFileSync(path, output);
}
const ids = Object.keys(sorted);
console.log(`${ids.filter((id) => active.has(id)).length} active rules linked; ${ids.filter((id) => retired.has(id)).length} retired links retained as history. Tests were not run.`);
