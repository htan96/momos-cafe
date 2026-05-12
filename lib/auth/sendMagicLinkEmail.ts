import { Resend } from "resend";

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
  const host = new URL(params.magicUrl).host;

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: "Your Momo's sign-in link",
    text: [
      "Hi — use this one-time link to sign in to Momo's:",
      "",
      params.magicUrl,
      "",
      `This link expires in 15 minutes. If you didn’t request it, you can ignore this email.`,
      "",
      `— Momo's Café (${host})`,
    ].join("\n"),
    html: `
      <p>Hi — tap the button below to sign in to Momo's. This link expires in <strong>15 minutes</strong>.</p>
      <p style="margin:24px 0">
        <a href="${params.magicUrl}" style="display:inline-block;background:#9e1b1b;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600;">
          Sign in to Momo's
        </a>
      </p>
      <p style="font-size:13px;color:#555">Or paste this URL into your browser:<br/><span style="word-break:break-all">${params.magicUrl}</span></p>
      <p style="font-size:13px;color:#777">If you didn’t request this, you can ignore this email.</p>
    `,
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
