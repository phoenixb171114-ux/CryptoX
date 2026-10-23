import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { deriveKey, encryptWithKey, decryptWithKey } from "./crypto";

/**
 * Storage for applicant resumes.
 *
 * Resumes are PDFs. They are encrypted at rest with a key derived from the
 * owner's email (HKDF of the server master key), so a stored file is an opaque
 * blob and is bound to one candidate. The file is written under
 * storage/resumes/<id>.enc; the random <id> and the original filename are kept
 * on the User row.
 */

const STORAGE_DIR = path.join(process.cwd(), "storage", "resumes");

export const RESUME_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** True if the buffer looks like a PDF (starts with the %PDF- signature). */
export function isPdf(buf: Buffer): boolean {
  return buf.length > 4 && buf.subarray(0, 5).toString("latin1") === "%PDF-";
}

/** Encrypt and store a resume for a candidate. Returns the storage id. */
export function storeResume(data: Buffer, email: string): string {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  const key = deriveKey(email.toLowerCase().trim());
  const packaged = encryptWithKey(data, key);
  const id = crypto.randomBytes(16).toString("hex");
  fs.writeFileSync(path.join(STORAGE_DIR, `${id}.enc`), packaged, "utf8");
  return id;
}

/** Decrypt a previously-stored resume for its owner. Throws on mismatch/not found. */
export function openResume(id: string, email: string): Buffer {
  if (!/^[a-f0-9]{32}$/.test(id)) throw new Error("Resume not found.");
  const file = path.join(STORAGE_DIR, `${id}.enc`);
  if (!fs.existsSync(file)) throw new Error("Resume not found.");
  const packaged = fs.readFileSync(file, "utf8");
  const key = deriveKey(email.toLowerCase().trim());
  // GCM auth tag verification fails loudly if the email (hence key) is wrong.
  return decryptWithKey(packaged, key);
}
