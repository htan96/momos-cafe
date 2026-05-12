import type { TransactionalContent } from "@/lib/email/types";
import { momosEmailShell } from "@/lib/email/layout";

/** Magic link authentication — wired from Resend today; SES-compatible HTML. */
export function buildMagicLinkEmail(params: { magicUrl: string; hostLabel: string }): TransactionalContent {
  const { magicUrl } = params;

  const textBody = [
    `Hi — use this one-time link to sign in to Momo's:`,
    "",
    magicUrl,
    "",
    `This link expires in 15 minutes. If you didn't request it, you can ignore this email.`,
  ].join("\n");

  const innerHtml = `
<p style="margin:0 0 18px;">Hi — tap below to finish signing in. This secure link disappears in <strong>15 minutes</strong>.</p>
<p style="margin:26px 0;text-align:center;">
  <a href="${magicUrl}"
     style="display:inline-block;background:#9e1b1b;color:#fff;padding:13px 24px;border-radius:12px;text-decoration:none;font-weight:650;font-size:15px;">
    Sign in to Momo's
  </a>
</p>
<p style="margin:14px 0 0;font-size:13px;color:#6b6560;line-height:1.45;">Prefer to paste?<br/><span style="word-break:break-all;color:#333;">${magicUrl}</span></p>
<p style="margin:18px 0 0;font-size:13px;color:#8a8379;">Didn't ask for this? Ignore the note — nothing changes on your profile.</p>
`;

  return {
    subject: "Your Momo's sign-in link",
    textBody,
    htmlBody: momosEmailShell({
      preheader: "Your secure Momo's sign-in link",
      heading: "Your sign-in link",
      innerHtml,
      hostLabel: params.hostLabel,
    }),
  };
}
