const FONT_STACK =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const MEANING_LOGO_URL = "https://usemeaning.io/Logo-dark.svg";

export function meaningEmailShell(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#F4F3F0;font-family:${FONT_STACK};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F3F0;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:32px 40px 24px 40px;border-bottom:1px solid #E5E4E1;">
            <img src="${MEANING_LOGO_URL}" alt="Meaning" width="120" style="display:block;height:auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 40px 40px;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;background-color:#FAFAF8;border-top:1px solid #E5E4E1;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#9A9A9A;">
              Meaning &middot; by Hivory
            </p>
            <p style="margin:6px 0 0 0;">
              <a href="https://usemeaning.io" style="font-size:12px;color:#9A9A9A;text-decoration:underline;">usemeaning.io</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function meaningEmailShellWithHeader(
  body: string,
  headerBg: string,
  headerContent: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#F4F3F0;font-family:${FONT_STACK};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F3F0;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:32px 40px 24px 40px;border-bottom:1px solid #E5E4E1;">
            <img src="${MEANING_LOGO_URL}" alt="Meaning" width="120" style="display:block;height:auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;background-color:${headerBg};color:#ffffff;">
            <h1 style="margin:0;font-size:18px;font-weight:600;">${headerContent}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 40px 40px;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;background-color:#FAFAF8;border-top:1px solid #E5E4E1;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#9A9A9A;">
              Meaning &middot; by Hivory
            </p>
            <p style="margin:6px 0 0 0;">
              <a href="https://usemeaning.io" style="font-size:12px;color:#9A9A9A;text-decoration:underline;">usemeaning.io</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
