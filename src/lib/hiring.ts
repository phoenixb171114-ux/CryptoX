import crypto from "node:crypto";
import { updateApplication } from "./db";
import { env } from "./env";

/**
 * Post-pass workflow: draft a contract and record it for the hiring team.
 *
 * Nothing is emailed. The contract reference and CEO meeting link are stored on
 * the application, and the draft is written to the server log so a human can
 * review it and follow up with the candidate directly.
 */

interface CandidateInfo {
  applicationId: string;
  email: string;
  name: string;
  score: number;
  summary: string;
}

function contractText(c: CandidateInfo, ref: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `GOODCRYPTOX — CONTRACTOR ENGAGEMENT LETTER
Reference: ${ref}
Date: ${today}

Between: GoodCryptoX ("the Company")
And:     ${c.name || c.email} ("the Developer")

1. Engagement. The Company offers the Developer an engagement as a software
   developer, subject to a mutually agreed start date discussed at the
   introductory meeting referenced below.

2. Scope. The Developer will contribute to the Company's crypto tooling
   products. Specific duties, schedule, and compensation will be finalised in a
   full agreement following the introductory meeting.

3. Assessment. This offer follows a successful technical assessment
   (reference score: ${c.score}/100).

4. Confidentiality. The Developer agrees to keep non-public Company materials,
   including assessment materials, confidential.

5. Nature of this letter. This letter expresses the Company's intent to engage
   the Developer and is not, by itself, a binding employment contract. A binding
   agreement will be executed in writing by both parties.

Signed for and on behalf of the Company:

    ${env.signatoryName}
    ${env.signatoryTitle}`;
}

/**
 * Run the pass workflow. Returns a short human-readable status the AI can relay.
 */
export async function runPassWorkflow(c: CandidateInfo): Promise<string> {
  const contractRef = `GCX-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const meetingRef = env.ceoCalendarLink || null;

  await updateApplication(c.applicationId, { stage: "CONTRACT_SENT", contractRef, meetingRef });

  console.log(
    `[hiring] Contract ${contractRef} drafted for ${c.email} (score ${c.score}/100). ${c.summary}
` +
      contractText(c, contractRef)
  );

  return meetingRef
    ? `Candidate passed. Contract ${contractRef} drafted for human review; the hiring team will follow up. The candidate can book an introductory call with our CEO here: ${meetingRef}`
    : `Candidate passed. Contract ${contractRef} drafted for human review; the hiring team will follow up to arrange a CEO meeting.`;
}
