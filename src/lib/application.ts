import { createApplication, findApplicationByUserId, isDuplicateKeyError, updateApplication } from "./db";
import { encrypt, decrypt } from "./crypto";
import type { ChatMessage } from "./ai";

/** Load (and lazily create) the application for a user. */
export async function getOrCreateApplication(userId: string) {
  const existing = await findApplicationByUserId(userId);
  if (existing) return existing;
  try {
    return await createApplication(userId);
  } catch (err) {
    // Two first requests raced and the unique index kept one; use that one.
    if (isDuplicateKeyError(err)) return (await findApplicationByUserId(userId))!;
    throw err;
  }
}

/** Decrypt the stored transcript into an array of chat messages. */
export function loadTranscript(transcriptEnc: string | null): ChatMessage[] {
  if (!transcriptEnc) return [];
  try {
    return JSON.parse(decrypt(transcriptEnc)) as ChatMessage[];
  } catch {
    return [];
  }
}

/** Persist the transcript (encrypted) back onto the application. */
export async function saveTranscript(applicationId: string, transcript: ChatMessage[]) {
  await updateApplication(applicationId, { transcriptEnc: encrypt(JSON.stringify(transcript)) });
}
