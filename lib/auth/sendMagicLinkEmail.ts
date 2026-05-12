import { Resend } from "resend";
import { buildMagicLinkEmail } from "@/lib/email/templates/magicLink";

export async function sendCustomerMagicLinkEmail(params: {
  to: string;
  magicUrl: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    console.error("[auth/magic-link] RESEND_API_KEY or RESEND_FROM_EMAIL missing");
    return { ok: false, message: "email_unconfigured" };
  }

  const resend = new Resend(apiKey);
  const hostLabel = new URL(params.magicUrl).host;

  const { subject, textBody, htmlBody } = buildMagicLinkEmail({
    magicUrl: params.magicUrl,
    hostLabel,
  });

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject,
    text: textBody,
    html: htmlBody,
  });

  if (error) {
    console.error("[auth/magic-link] Resend error", error);
    return { ok: false, message: error.message ?? "resend_failed" };
  }

  if (!data?.id) {
    return { ok: false, message: "resend_no_id" };
  }

  return { ok: true };
}
