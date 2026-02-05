import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Share auth cookies across www and apex (e.g. usemeaning.io and www.usemeaning.io)
// so PKCE/state are available on callback regardless of which host the user started on.
const nextAuthUrl = process.env.NEXTAUTH_URL ?? "";
const cookieDomain =
  nextAuthUrl.includes("usemeaning.io") ? ".usemeaning.io" : undefined;

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  ...(cookieDomain && {
    cookies: {
      pkceCodeVerifier: { options: { domain: cookieDomain } },
      state: { options: { domain: cookieDomain } },
      sessionToken: { options: { domain: cookieDomain } },
      callbackUrl: { options: { domain: cookieDomain } },
    },
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/analytics.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // On initial sign in, persist the OAuth tokens
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }

      // If token hasn't expired, return it as-is
      if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
        return token;
      }

      // Token has expired — try to refresh it
      if (token.refreshToken) {
        try {
          const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              grant_type: "refresh_token",
              refresh_token: token.refreshToken,
            }),
          });

          const tokens = await response.json();

          if (!response.ok) throw tokens;

          token.accessToken = tokens.access_token;
          token.expiresAt = Math.floor(Date.now() / 1000 + tokens.expires_in);
          if (tokens.refresh_token) {
            token.refreshToken = tokens.refresh_token;
          }
        } catch {
          token.error = "RefreshAccessTokenError";
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
});
