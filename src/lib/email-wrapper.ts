/** Wrap generated alert content in a consistent email layout. */
export function buildEmailWrapper(
  propertyLabel: string,
  frequency: string,
  alertTypeLabel: string,
  contentHtml: string,
  senderName: string,
  isTest = false
): string {
  const testBanner = isTest
    ? `<div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px;">
        <p style="color: #856404; font-size: 13px; margin: 0; font-weight: 600;">This is a test email. No action is needed.</p>
      </div>`
    : "";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${testBanner}
      <h2 style="color: #1a1a1a; margin-bottom: 4px;">${alertTypeLabel}</h2>
      <p style="color: #666; font-size: 14px; margin-top: 0;">${propertyLabel} &middot; ${frequency} report</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      ${contentHtml}
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">
        Sent by <a href="https://usemeaning.io" style="color: #999;">Meaning</a>
        &middot; You received this because ${senderName} set up an alert.
      </p>
    </div>
  `.trim();
}
