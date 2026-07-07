import { meaningEmailShell } from "./email-shell";

/** Wrap generated alert content in a consistent email layout. */
export function buildEmailWrapper(
  propertyLabel: string,
  scheduleDescription: string,
  alertTypeLabel: string,
  contentHtml: string,
  senderName: string,
  isTest = false
): string {
  const testBanner = isTest
    ? `<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
        <p style="color:#856404;font-size:13px;margin:0;font-weight:600;">This is a test email. No action is needed.</p>
      </div>`
    : "";

  return meaningEmailShell(`
    ${testBanner}
    <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9A9A9A;">${propertyLabel} &middot; ${scheduleDescription}</p>
    <h1 style="margin:0 0 24px 0;font-size:22px;font-weight:500;color:#1A1A1A;letter-spacing:-0.02em;">${alertTypeLabel}</h1>
    ${contentHtml}
    <p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#9A9A9A;">
      Sent by <a href="https://usemeaning.io" style="color:#9A9A9A;text-decoration:underline;">Meaning</a>
      &middot; You received this because ${senderName} set up an alert.
    </p>
  `);
}
