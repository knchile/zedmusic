/**
 * Minimal, dependency-free transactional email templates.
 * Inline styles only: email clients ignore external CSS.
 */

export type EmailTemplate =
  | { kind: "verify-email"; name: string; url: string }
  | { kind: "reset-password"; name: string; url: string }
  | { kind: "password-changed"; name: string };

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#0b0f0c;font-family:Arial,Helvetica,sans-serif;color:#e9efe9">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#121814;border-radius:16px;overflow:hidden">
<tr><td style="height:6px;background:linear-gradient(90deg,#198a00 0 70%,#de2010 70% 80%,#000 80% 90%,#ef7d00 90%)"></td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 20px;font-size:18px;font-weight:bold;color:#fff">Zed Music Online</p>
<h1 style="margin:0 0 16px;font-size:22px;color:#fff">${escape(title)}</h1>
${bodyHtml}
<p style="margin:28px 0 0;font-size:12px;color:#8a978c">You received this email because of activity on your Zed Music Online account. If this wasn't you, you can ignore it.</p>
</td></tr></table></td></tr></table></body></html>`;
}

const button = (url: string, label: string) =>
  `<p style="margin:24px 0"><a href="${escape(url)}" style="display:inline-block;background:#2bb24c;color:#06210d;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">${escape(label)}</a></p>
<p style="font-size:12px;color:#8a978c;word-break:break-all">Or paste this link into your browser:<br>${escape(url)}</p>`;

export function renderEmail(t: EmailTemplate): { subject: string; html: string; text: string } {
  switch (t.kind) {
    case "verify-email":
      return {
        subject: "Confirm your email — Zed Music Online",
        html: layout(
          `Welcome, ${t.name}`,
          `<p style="line-height:1.6">Confirm your email address to finish setting up your account.</p>${button(t.url, "Confirm email")}<p style="font-size:13px;color:#8a978c">This link expires in 1 hour.</p>`,
        ),
        text: `Welcome, ${t.name}.\n\nConfirm your email address: ${t.url}\n\nThis link expires in 1 hour.`,
      };
    case "reset-password":
      return {
        subject: "Reset your password — Zed Music Online",
        html: layout(
          "Reset your password",
          `<p style="line-height:1.6">Hi ${escape(t.name)}, we received a request to reset your password.</p>${button(t.url, "Choose a new password")}<p style="font-size:13px;color:#8a978c">This link expires in 1 hour. If you didn't ask for this, your password stays the same.</p>`,
        ),
        text: `Hi ${t.name},\n\nReset your password: ${t.url}\n\nThis link expires in 1 hour. If you didn't ask for this, ignore this email.`,
      };
    case "password-changed":
      return {
        subject: "Your password was changed — Zed Music Online",
        html: layout(
          "Your password was changed",
          `<p style="line-height:1.6">Hi ${escape(t.name)}, the password for your account was just changed and other sessions were signed out. If this wasn't you, reset your password immediately.</p>`,
        ),
        text: `Hi ${t.name},\n\nThe password for your account was just changed. If this wasn't you, reset your password immediately.`,
      };
  }
}
