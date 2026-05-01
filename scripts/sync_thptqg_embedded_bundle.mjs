import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const JSON_PATH = path.join(ROOT, "backend", "mock", "thptqg_fulltest.json");
const EMBEDDED_PATH = path.join(
  ROOT,
  "frontend",
  "js",
  "chatbot",
  "services",
  "embeddedThptqgFullTestBundle.js",
);

const bundle = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
const raw = JSON.stringify(bundle, null, 2);
const encoded = JSON.stringify(raw);

fs.writeFileSync(
  EMBEDDED_PATH,
  `export const EMBEDDED_THPTQG_FULLTEST = JSON.parse(${encoded});\n`,
  "utf8",
);

console.log(`Synced embedded bundle from ${path.relative(ROOT, JSON_PATH)}`);
