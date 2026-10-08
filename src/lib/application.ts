import { prisma } from "./db";
import { encrypt, decrypt } from "./crypto";
import type { ChatMessage } from "./ai";

/** Load (and lazily create) the application for a user. */
export async function getOrCreateApplication(userId: string) {
  const existing = await prisma.application.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.application.create({ data: { userId, stage: "REGISTERED" } });
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
  await prisma.application.update({
    where: { id: applicationId },
    data: { transcriptEnc: encrypt(JSON.stringify(transcript)) },
  });
}
