import NextAuth, { customFetch } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Validate required env vars — fixes "Configuration" error; check server console for missing vars
const required = [
  "AUTH_SECRET",
  "NEXTAUTH_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const;
const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length > 0 && process.env.NODE_ENV !== "test") {
  console.error(
    "[auth] Missing required env (auth will show Configuration error):",
    missing.join(", ")
  );
}

const TOKEN_EXCHANGE_TIMEOUT_MS = 25_000;

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    TOKEN_EXCHANGE_TIMEOUT_MS
  );
  return fetch(input, {
    ...init,
    signal: init?.signal ?? controller.signal,
  }).finally(() => clearTimeout(timeout));
}

// Share auth cookies across www and apex so PKCE/state are available on callback.
// Set AUTH_COOKIE_DOMAIN=0 or false to disable (e.g. to fix 502 or PKCE issues).
const nextAuthUrl = process.env.NEXTAUTH_URL ?? "";
const isSecure = nextAuthUrl.startsWith("https://");
const isProductionUsemeaning =
  isSecure && nextAuthUrl.includes("usemeaning.io");
const raw = process.env.AUTH_COOKIE_DOMAIN;
const cookieDomain =
  raw === "0" || raw === "false" || raw === ""
    ? undefined
    : raw !== undefined
      ? raw || undefined
      : isProductionUsemeaning
        ? ".usemeaning.io"
        : undefined;

// Provide FULL cookie options for every override — Auth.js beta can
// shallow-replace the options object, so only setting `domain` would
// drop httpOnly / sameSite / secure / path / maxAge.  Without secure
// the __Secure- prefixed cookie is rejected by the browser, causing
// "InvalidCheck: pkceCodeVerifier value could not be parsed" on callback.
// PKCE & state cookies additionally need sameSite:"none" because the
// OAuth redirect from Google is a cross-site navigation.
const crossSiteOpts = {
  httpOnly: true,
  sameSite: "none" as const,
  path: "/",
  secure: isSecure,
  maxAge: 900, // 15 min — matches Auth.js default
  ...(cookieDomain && { domain: cookieDomain }),
};
const sameSiteOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: isSecure,
  ...(cookieDomain && { domain: cookieDomain }),
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    newUser: "/pricing",
    error: "/auth-error",
  },
  cookies: {
    pkceCodeVerifier: { options: crossSiteOpts },
    state: { options: crossSiteOpts },
    sessionToken: { options: sameSiteOpts },
    callbackUrl: { options: sameSiteOpts },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      [customFetch]: fetchWithTimeout,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/analytics.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // On initial sign-in, persist user id and OAuth tokens
      if (user) {
        token.userId = user.id;
      }

      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.provider = account.provider;
      }

      // For credential users who linked a Google account, load tokens from DB
      if (!token.accessToken && token.userId) {
        try {
          const googleAccount = await prisma.account.findFirst({
            where: { userId: token.userId as string, provider: "google" },
          });
          if (googleAccount?.access_token) {
            token.accessToken = googleAccount.access_token;
            token.refreshToken = googleAccount.refresh_token ?? undefined;
            token.expiresAt = googleAccount.expires_at ?? undefined;
          }
        } catch (err) {
          console.error("[auth] Google account DB lookup failed:", err);
        }
      }

      // No refresh token available — nothing to refresh
      if (!token.refreshToken) {
        return token;
      }

      // If token hasn't expired, return it as-is
      if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
        return token;
      }

      // Token has expired — try to refresh it
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

        // Persist refreshed token to Account table so cron jobs can use it
        if (token.userId) {
          try {
            const acct = await prisma.account.findFirst({
              where: { userId: token.userId as string, provider: "google" },
              select: { id: true },
            });
            if (acct) {
              await prisma.account.update({
                where: { id: acct.id },
                data: {
                  access_token: tokens.access_token,
                  expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
                  ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
                },
              });
            }
          } catch (dbErr) {
            console.error("[auth] Failed to persist refreshed token:", dbErr);
          }
        }
      } catch {
        token.error = "RefreshAccessTokenError";
      }

      return token;
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).userId = token.userId;
      (session as any).accessToken = token.accessToken;
      (session as any).error = token.error;
      return session;
    },
  },
});
