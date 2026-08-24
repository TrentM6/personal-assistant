#!/usr/bin/env node
// validate-docs.mjs — the "build check" for a pure-documentation repo.
// No dependencies on purpose (no npm install step in the workflow): every
// markdown file must be non-empty valid UTF-8, and every fenced ```json
// block must parse. YAML blocks get a cheap sanity check only (no tabs,
// Node has no built-in YAML parser and this repo has no npm deps to add one).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules" || name === ".github") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

let failures = 0;
const files = walk(".");
if (!files.length) {
  console.error("No markdown files found — that's suspicious for a docs repo, failing.");
  process.exit(1);
}

for (const f of files) {
  const raw = readFileSync(f, "utf8");
  if (!raw.trim()) {
    console.error(`EMPTY: ${f}`);
    failures++;
    continue;
  }
  const fenceRe = /```(json|yaml|yml)\n([\s\S]*?)```/g;
  let m;
  while ((m = fenceRe.exec(raw))) {
    const [, lang, body] = m;
    if (lang === "json") {
      try {
        JSON.parse(body);
      } catch (e) {
        console.error(`BAD JSON in ${f}: ${e.message}`);
        failures++;
      }
    } else if (/\t/.test(body)) {
      console.error(`YAML block in ${f} contains a literal tab — invalid YAML`);
      failures++;
    }
  }
}

console.log(`Checked ${files.length} markdown file(s).`);
if (failures) {
  console.error(`${failures} problem(s) found.`);
  process.exit(1);
}
console.log("All clear.");
