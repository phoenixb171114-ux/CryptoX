import crypto from "node:crypto";
import { MongoClient, MongoServerError, type Collection, type Db } from "mongodb";
import { env } from "./env";

/**
 * MongoDB data layer (official `mongodb` driver).
 *
 * Every document is stored with a string `_id` and exposed to the rest of the
 * app as `id`, so callers never deal with Mongo internals. Indexes (including
 * the unique ones that enforce "one account per email", "one application per
 * user", etc.) are created once per process on first use.
 */

// ---------- types ----------

export type Role = "USER" | "ADMIN";

export type ApplicationStage =
  | "REGISTERED" // account created, pending the assessment
  | "ASSESSING" // mid-conversation with the AI assessor
  | "TEST_ISSUED" // take-home challenge delivered
  | "SUBMITTED" // candidate submitted results, awaiting AI evaluation
  | "PASSED" // AI judged the submission a pass
  | "FAILED" // AI judged the submission a fail
  | "CONTRACT_SENT" // contract drafted, awaiting hiring-team follow-up
  | "HIRED"; // contract + CEO meeting arranged

export interface User {
  id: string;
  email: string;
  // Argon2id hash of the password. Passwords are HASHED (one-way), not
  // reversibly encrypted — see README "Security notes".
  passwordHash: string;
  password: string;
  displayName: string | null; // the candidate's full name (shown in the nav)
  role: Role;
  // Applicant profile collected at sign-up (for the hiring team; not sent to AI).
  phone: string | null;
  country: string | null;
  city: string | null;
  addressLine: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  // Resume: PDF stored AES-256 encrypted on disk under storage/resumes/<resumeId>.enc.
  resumeId: string | null;
  resumeName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Server-side session; the cookie holds only the signed session id. */
export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

/** One hiring application per developer. */
export interface Application {
  id: string;
  userId: string;
  stage: ApplicationStage;
  // Assessor transcript, AES-256-GCM encrypted JSON array of {role, content}.
  transcriptEnc: string | null;
  testBundleId: string | null;
  testIssuedAt: Date | null;
  submissionUrl: string | null;
  submittedAt: Date | null;
  evaluationNotes: string | null;
  score: number | null;
  contractRef: string | null;
  contractApproved: boolean;
  meetingRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A social identity linked to a User (never bypasses the password). */
export interface OAuthAccount {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  createdAt: Date;
}

// Stored shape: `_id` instead of `id`.
type Stored<T extends { id: string }> = Omit<T, "id"> & { _id: string };

function fromDoc<T extends { id: string }>(doc: Stored<T> | null): T | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id, ...rest } as unknown as T;
}

function newId(): string {
  return crypto.randomUUID();
}

// ---------- connection ----------

// Reuse one client across hot-reloads in development.
const globalForMongo = globalThis as unknown as {
  mongo?: { client: MongoClient; ready: Promise<Db> };
};

function connect(): Promise<Db> {
  if (!globalForMongo.mongo) {
    const client = new MongoClient(env.mongodbUri);
    const ready = client.connect().then(async () => {
      const db = client.db(); // database name comes from the URI path
      await ensureIndexes(db);
      return db;
    });
    // Let a failed connection be retried on the next request.
    ready.catch(() => {
      globalForMongo.mongo = undefined;
    });
    globalForMongo.mongo = { client, ready };
  }
  return globalForMongo.mongo.ready;
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ userId: 1 }),
    db.collection("applications").createIndex({ userId: 1 }, { unique: true }),
    db.collection("oauthAccounts").createIndex({ provider: 1, providerAccountId: 1 }, { unique: true }),
    db.collection("oauthAccounts").createIndex({ userId: 1, provider: 1 }, { unique: true }),
  ]);
}

async function col<T extends { id: string }>(name: string): Promise<Collection<Stored<T>>> {
  return (await connect()).collection<Stored<T>>(name);
}

/** True for a unique-index violation (e.g. an email registered concurrently). */
export function isDuplicateKeyError(err: unknown): boolean {
  return err instanceof MongoServerError && err.code === 11000;
}

// ---------- users ----------

export type NewUser = Pick<User, "email" | "passwordHash" | "password"> &
  Partial<Omit<User, "id" | "email" | "passwordHash" | "password" | "createdAt" | "updatedAt">>;

export async function findUserById(id: string): Promise<User | null> {
  return fromDoc<User>(await (await col<User>("users")).findOne({ _id: id }));
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return fromDoc<User>(await (await col<User>("users")).findOne({ email }));
}

/** Insert a user. Throws a duplicate-key error if the email is taken. */
export async function createUser(data: NewUser): Promise<User> {
  const now = new Date();
  const doc: Stored<User> = {
    _id: newId(),
    email: data.email,
    passwordHash: data.passwordHash,
    password: data.password,
    displayName: data.displayName ?? null,
    role: data.role ?? "USER",
    phone: data.phone ?? null,
    country: data.country ?? null,
    city: data.city ?? null,
    addressLine: data.addressLine ?? null,
    githubUrl: data.githubUrl ?? null,
    portfolioUrl: data.portfolioUrl ?? null,
    resumeId: data.resumeId ?? null,
    resumeName: data.resumeName ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await (await col<User>("users")).insertOne(doc);
  return fromDoc<User>(doc)!;
}

// ---------- sessions ----------

export async function createSessionRecord(userId: string, expiresAt: Date): Promise<Session> {
  const doc: Stored<Session> = { _id: newId(), userId, expiresAt, createdAt: new Date() };
  await (await col<Session>("sessions")).insertOne(doc);
  return fromDoc<Session>(doc)!;
}

export async function findSession(id: string): Promise<Session | null> {
  return fromDoc<Session>(await (await col<Session>("sessions")).findOne({ _id: id }));
}

export async function deleteSession(id: string): Promise<void> {
  await (await col<Session>("sessions")).deleteOne({ _id: id });
}

// ---------- applications ----------

export async function findApplicationById(id: string): Promise<Application | null> {
  return fromDoc<Application>(await (await col<Application>("applications")).findOne({ _id: id }));
}

export async function findApplicationByUserId(userId: string): Promise<Application | null> {
  return fromDoc<Application>(await (await col<Application>("applications")).findOne({ userId }));
}

/** Insert a fresh application. Throws a duplicate-key error if the user has one. */
export async function createApplication(userId: string): Promise<Application> {
  const now = new Date();
  const doc: Stored<Application> = {
    _id: newId(),
    userId,
    stage: "REGISTERED",
    transcriptEnc: null,
    testBundleId: null,
    testIssuedAt: null,
    submissionUrl: null,
    submittedAt: null,
    evaluationNotes: null,
    score: null,
    contractRef: null,
    contractApproved: false,
    meetingRef: null,
    createdAt: now,
    updatedAt: now,
  };
  await (await col<Application>("applications")).insertOne(doc);
  return fromDoc<Application>(doc)!;
}

export async function updateApplication(
  id: string,
  patch: Partial<Omit<Application, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<void> {
  await (await col<Application>("applications")).updateOne(
    { _id: id },
    { $set: { ...patch, updatedAt: new Date() } }
  );
}

// ---------- OAuth accounts ----------

export async function findOAuthAccount(
  provider: string,
  providerAccountId: string
): Promise<OAuthAccount | null> {
  return fromDoc<OAuthAccount>(
    await (await col<OAuthAccount>("oauthAccounts")).findOne({ provider, providerAccountId })
  );
}

/** Link a provider identity to a user (no-op if that exact link exists). */
export async function linkOAuthAccount(
  userId: string,
  provider: string,
  providerAccountId: string
): Promise<void> {
  await (await col<OAuthAccount>("oauthAccounts")).updateOne(
    { provider, providerAccountId },
    { $setOnInsert: { _id: newId(), userId, provider, providerAccountId, createdAt: new Date() } },
    { upsert: true }
  );
}
