export function momosEmailShell(params: {
  preheader?: string;
  heading: string;
  innerHtml: string;
  hostLabel: string;
}): string {
  const safePre = params.preheader
    ? `<span style="display:none!important;color:transparent;height:0;max-height:0;max-width:0;opacity:0;width:0;">${escapeHtml(
        params.preheader
      )}</span>`
    : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;background:#fdf8ee;font-family:'Source Sans 3','Segoe UI',sans-serif;color:#2b2622;">
${safePre}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="border:1px solid #d8c495;border-radius:16px;background:#ffffff;overflow:hidden;">
<tr><td style="background:#0f4f4f;padding:22px 24px;color:#fcf4e8;">
<p style="margin:0;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;opacity:.9;">${escapeHtml(params.hostLabel)}</p>
<p style="margin:14px 0 0;font-size:22px;font-weight:650;line-height:1.15;">${escapeHtml(params.heading)}</p>
</td></tr>
<tr><td style="padding:26px 24px 34px;line-height:1.55;color:#3a3430;font-size:15px;">
${params.innerHtml}
</td></tr>
<tr><td style="padding:14px 24px 22px;background:#fdf8ee;border-top:1px solid #efe4ce;font-size:12px;color:#6b6560;line-height:1.45;text-align:center;">
— Momo's Café (${escapeHtml(params.hostLabel)})
</td></tr>
</table></td></tr></table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
