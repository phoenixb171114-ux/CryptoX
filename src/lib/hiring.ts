import crypto from "node:crypto";
import { prisma } from "./db";
import { env } from "./env";
import { sendMail, emailLayout, button } from "./mailer";

/**
 * Post-pass workflow: draft a signed contract and arrange a CEO meeting.
 *
 * Safety design: by default (REQUIRE_CONTRACT_APPROVAL=true) the contract is
 * generated and a review notice is sent to the hiring inbox; it is emailed to
 * the candidate only after a human approves it in the admin view. Set the flag
 * to "false" to let the AI send it fully autonomously.
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
    ${env.signatoryTitle}

Please reply to this email to accept, and use the meeting link to book your
introductory call with our CEO.`;
}

/**
 * Run the pass workflow. Returns a short human-readable status the AI can relay.
 */
export async function runPassWorkflow(c: CandidateInfo): Promise<string> {
  const contractRef = `GCX-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const meetingRef = env.ceoCalendarLink || "(a scheduling link will follow by email)";
  const body = contractText(c, contractRef);

  await prisma.application.update({
    where: { id: c.applicationId },
    data: {
      stage: "CONTRACT_SENT",
      contractRef,
      meetingRef,
      contractApproved: !env.requireContractApproval,
    },
  });

  if (env.requireContractApproval) {
    // Human-in-the-loop: notify the hiring inbox for approval instead of sending.
    await sendMail({
      from: env.mail.from,
      to: env.mail.reviewInbox,
      subject: `[Approval needed] Contract ${contractRef} for ${c.email}`,
      html: emailLayout(
        "Contract ready for approval",
        `<p>Candidate <strong>${c.email}</strong> passed the assessment (score ${c.score}/100).</p>
         <p>${c.summary}</p>
         <p>Approve in the admin panel to send the contract and CEO meeting invite.</p>
         <pre style="white-space:pre-wrap;background:#0f1522;padding:12px;border-radius:8px;">${body}</pre>`
      ),
    });
    return "Candidate passed. Contract drafted and sent to the hiring inbox for human approval before it goes out.";
  }

  // Autonomous send.
  await sendContractToCandidate(c, contractRef, meetingRef, body);
  await prisma.application.update({
    where: { id: c.applicationId },
    data: { stage: "HIRED" },
  });
  return "Candidate passed. Contract and CEO meeting invite emailed to the candidate.";
}

/** Sends the finalised contract + meeting invite to the candidate. */
export async function sendContractToCandidate(
  c: CandidateInfo,
  contractRef: string,
  meetingLink: string,
  body?: string
): Promise<void> {
  const text = body ?? contractText(c, contractRef);
  await sendMail({
    from: env.mail.from,
    replyTo: env.mail.reviewInbox,
    to: c.email,
    subject: `Welcome to GoodCryptoX — your contract (${contractRef})`,
    attachments: [{ filename: `${contractRef}.txt`, content: text, contentType: "text/plain" }],
    html: emailLayout(
      "Congratulations — welcome aboard!",
      `<p>Hi ${c.name || "there"},</p>
       <p>You passed our technical assessment and we'd love to work with you. Your
       engagement letter (ref <strong>${contractRef}</strong>) is attached, signed by
       ${env.signatoryName}.</p>
       <p>Next step: book a short introductory call with our CEO.</p>
       <p>${env.ceoCalendarLink ? button(env.ceoCalendarLink, "Book your CEO meeting") : "We'll follow up shortly with a scheduling link."}</p>
       <p>Reply to this email to accept. We're excited to meet you!</p>`
    ),
  });
}
