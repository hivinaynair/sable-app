// Builds docs/verification.json from test titles that start with a journey rule ID,
// e.g. it("J5.S2.c1 ..."). Run after adding or renaming tests.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const docs = join(root, "docs");
const title = /\bit(?:\.each<[^>]*>\([^)]*\))?\(\s*"((?:J\d+\.S\d+\.c\d+|I\d+)\b[^"]*)"/g;

function* testFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* testFiles(path);
    else if (entry.name.endsWith(".test.ts")) yield path;
  }
}

const map = {};
for (const dir of ["packages", "apps"].map((d) => join(root, d))) {
  let files;
  try { files = [...testFiles(dir)]; } catch { continue; }
  for (const file of files) {
    for (const [, name] of readFileSync(file, "utf8").matchAll(title)) {
      const id = name.split(" ")[0];
      (map[id] ??= []).push({ path: relative(docs, file), locator: name });
    }
  }
}

const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })));
writeFileSync(join(docs, "verification.json"), JSON.stringify(sorted, null, 2) + "\n");
console.log(`${Object.keys(sorted).length} rules linked`);
