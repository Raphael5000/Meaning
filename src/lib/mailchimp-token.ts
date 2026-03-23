import { prisma } from "@/lib/prisma";

/**
 * Mailchimp token and data center retrieval.
 *
 * Mailchimp access tokens never expire — they remain valid until
 * the user revokes the app. No refresh logic is needed.
 * The data center prefix (e.g. "us6") is stored in session_state.
 */

export interface MailchimpCredentials {
  accessToken: string;
  dc: string; // data center prefix, e.g. "us6"
  apiEndpoint: string; // e.g. "https://us6.api.mailchimp.com"
}

export async function getMailchimpCredentials(
  userId: string
): Promise<MailchimpCredentials | null> {
  try {
    const account = await prisma.account.findFirst({
      where: { userId, provider: "mailchimp" },
      select: {
        access_token: true,
        session_state: true, // dc prefix
        scope: true, // api_endpoint
      },
    });

    if (!account?.access_token || !account.session_state) return null;

    return {
      accessToken: account.access_token,
      dc: account.session_state,
      apiEndpoint: account.scope ?? `https://${account.session_state}.api.mailchimp.com`,
    };
  } catch (err) {
    console.error("[mailchimp-token] DB lookup failed:", err);
    return null;
  }
}
