import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { configure, ZipWriter, Uint8ArrayReader, Uint8ArrayWriter } from "@zip.js/zip.js";
import { deriveKey, encryptWithKey, decryptWithKey } from "./crypto";

// Compress on the main thread: zip.js defaults to Web Workers, which Node lacks.
configure({ useWebWorkers: false });

/**
 * Packages the `./test` directory into a single bundle and encrypts it with a
 * key derived from the candidate's email address (HKDF of the master key with
 * the email as context). This:
 *   - binds every bundle to one candidate (a bundle for alice@x cannot be
 *     decrypted with the key derived for bob@y);
 *   - keeps the test materials unreadable at rest and in transit as an opaque
 *     blob.
 *
 * The master key never leaves the server, so decryption happens server-side for
 * the authenticated owner, then re-packed as a password-protected ZIP
 * (AES-256, password = the candidate's email) for download.
 */

const TEST_DIR = path.join(process.cwd(), "test");
const STORAGE_DIR = path.join(process.cwd(), "storage", "test-bundles");

/**
 * One entry of the bundle. The challenge is a git exercise, so the bundle is a
 * byte-exact copy of `./test`: binary files (git objects, screenshots) as
 * base64, and empty directories (e.g. `client/`, `.git/refs/tags`) as their
 * own entries so they survive the round trip.
 */
type BundleEntry =
  | { path: string; type: "file"; data: string } // data: base64
  | { path: string; type: "dir" };

interface Bundle {
  name: string;
  createdAt: string;
  version?: 2; // absent on legacy bundles (text files only, no .git)
  entries?: BundleEntry[];
  files?: { path: string; content: string }[]; // legacy: utf-8 contents
}

// Everything is copied, including `.git`; only installed dependencies are skipped.
const SKIP = new Set(["node_modules"]);

function walk(dir: string, baseDir: string, acc: BundleEntry[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => !SKIP.has(e.name));
  const rel = path.relative(baseDir, dir).split(path.sep).join("/");
  if (entries.length === 0 && rel) acc.push({ path: rel, type: "dir" });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, baseDir, acc);
    } else if (entry.isFile()) {
      acc.push({
        path: path.relative(baseDir, full).split(path.sep).join("/"),
        type: "file",
        data: fs.readFileSync(full).toString("base64"),
      });
    }
  }
}

function buildBundle(): Bundle {
  if (!fs.existsSync(TEST_DIR)) {
    throw new Error(`Test directory not found at ${TEST_DIR}`);
  }
  const entries: BundleEntry[] = [];
  walk(TEST_DIR, TEST_DIR, entries);
  return {
    name: "gcx-take-home-challenge",
    createdAt: new Date().toISOString(),
    version: 2,
    entries,
  };
}

/** Normalise legacy (text-only) bundles to the current entry format. */
function bundleEntries(bundle: Bundle): BundleEntry[] {
  if (bundle.entries) return bundle.entries;
  return (bundle.files ?? []).map((f) => ({
    path: f.path,
    type: "file" as const,
    data: Buffer.from(f.content, "utf8").toString("base64"),
  }));
}

/**
 * Create (or recreate) an encrypted bundle for a candidate.
 * Returns a bundle id used to fetch it later.
 */
export function issueTestBundle(email: string): string {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });

  const bundle = buildBundle();
  const key = deriveKey(email.toLowerCase().trim());
  const packaged = encryptWithKey(JSON.stringify(bundle), key);

  // Id is a random handle; it carries no secret and is safe to store/send.
  const id = crypto.randomBytes(16).toString("hex");
  fs.writeFileSync(path.join(STORAGE_DIR, `${id}.enc`), packaged, "utf8");
  return id;
}

/** Decrypt a previously-issued bundle for its owner. Throws if email mismatches. */
export function openTestBundle(id: string, email: string): Bundle {
  const file = path.join(STORAGE_DIR, `${id}.enc`);
  if (!/^[a-f0-9]{32}$/.test(id) || !fs.existsSync(file)) {
    throw new Error("Bundle not found.");
  }
  const packaged = fs.readFileSync(file, "utf8");
  const key = deriveKey(email.toLowerCase().trim());
  // GCM auth tag verification fails loudly if the email (hence key) is wrong.
  const json = decryptWithKey(packaged, key).toString("utf8");
  return JSON.parse(json) as Bundle;
}

/**
 * Pack a bundle as a password-protected ZIP (AES-256, WinZip AE-2 format).
 * Everything sits under a top-level `gcx-challenge/` folder, `.git` and empty
 * folders included. Opens with 7-Zip, WinRAR, Keka, or `7z x`; the built-in
 * Windows/macOS extractors and Info-ZIP `unzip` don't support AES.
 */
export async function zipTestBundle(bundle: Bundle, password: string): Promise<Uint8Array> {
  const writer = new ZipWriter(new Uint8ArrayWriter(), { password, encryptionStrength: 3 });
  for (const e of bundleEntries(bundle)) {
    const name = `gcx-challenge/${e.path}`;
    if (e.type === "dir") {
      await writer.add(`${name}/`, undefined, { directory: true });
    } else {
      await writer.add(name, new Uint8ArrayReader(Buffer.from(e.data, "base64")));
    }
  }
  return writer.close();
}
