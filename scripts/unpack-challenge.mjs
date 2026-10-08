// Unpack a GoodCryptoX challenge bundle into files.
// Usage:  node scripts/unpack-challenge.mjs gcx-challenge.json [targetDir]
import fs from "node:fs";
import path from "node:path";

const input = process.argv[2];
const target = process.argv[3] ?? "gcx-challenge";
if (!input) {
  console.error("Usage: node scripts/unpack-challenge.mjs <gcx-challenge.json> [targetDir]");
  process.exit(1);
}

const bundle = JSON.parse(fs.readFileSync(input, "utf8"));
for (const f of bundle.files) {
  const dest = path.join(target, f.path);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, f.content);
}
console.log(`Unpacked ${bundle.files.length} files into ${target}/`);
console.log("Start with CHALLENGE.md, then run: npm install && npm test");
