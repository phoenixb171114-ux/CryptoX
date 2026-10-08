import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { deriveKey, encryptWithKey, decryptWithKey } from "./crypto";

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
 * the authenticated owner; the plaintext bundle is then streamed over HTTPS.
 */

const TEST_DIR = path.join(process.cwd(), "test");
const STORAGE_DIR = path.join(process.cwd(), "storage", "test-bundles");

interface BundleFile {
  path: string; // relative path within the bundle
  content: string; // utf-8 file contents
}

interface Bundle {
  name: string;
  createdAt: string;
  files: BundleFile[];
}

function walk(dir: string, baseDir: string, acc: BundleFile[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, baseDir, acc);
    } else {
      acc.push({
        path: path.relative(baseDir, full).split(path.sep).join("/"),
        content: fs.readFileSync(full, "utf8"),
      });
    }
  }
}

function buildBundle(): Bundle {
  if (!fs.existsSync(TEST_DIR)) {
    throw new Error(`Test directory not found at ${TEST_DIR}`);
  }
  const files: BundleFile[] = [];
  walk(TEST_DIR, TEST_DIR, files);
  return {
    name: "gcx-take-home-challenge",
    createdAt: new Date().toISOString(),
    files,
  };
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
