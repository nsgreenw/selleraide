import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    resendInstance = new Resend(key);
  }
  return resendInstance;
}

const FEEDBACK_EMAIL = process.env.FEEDBACK_EMAIL ?? "support@selleraide.com";

export async function sendFeedbackEmail(
  userEmail: string,
  message: string,
  pageUrl?: string
) {
  const resend = getResend();

  await resend.emails.send({
    from: "SellerAide Feedback <feedback@selleraide.com>",
    to: FEEDBACK_EMAIL,
    subject: `Feedback from ${userEmail}`,
    text: [
      `From: ${userEmail}`,
      pageUrl ? `Page: ${pageUrl}` : null,
      "",
      message,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}
