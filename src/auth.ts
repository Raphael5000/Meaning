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
// However, sameSite:"none" REQUIRES secure:true — browsers silently
// reject the cookie otherwise.  On HTTP localhost we fall back to "lax",
// which still works because the Google redirect is a top-level GET.
const crossSiteOpts = {
  httpOnly: true,
  sameSite: (isSecure ? "none" : "lax") as "none" | "lax",
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
          scope: "openid email profile",
          prompt: "select_account",
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
  events: {
    // Preserve elevated scopes on re-login. The PrismaAdapter overwrites the
    // Account record with the narrow login scope ("openid email profile"),
    // wiping the broader scope granted by /api/auth/connect-google-ads.
    // This event fires after the adapter write, so we restore the stored scope.
    async signIn({ account: signInAccount }) {
      if (signInAccount?.provider === "google" && signInAccount.scope) {
        // The adapter already wrote the narrow scope. Check if it was broader before.
        // We can't read the "before" state, so we always re-merge adwords if the
        // new scope doesn't include it. The connect-google-ads flow stores the
        // broad scope, so if adwords was there, the refresh_token proves it.
        try {
          const existing = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: "google",
                providerAccountId: signInAccount.providerAccountId,
              },
            },
            select: { id: true, scope: true, refresh_token: true },
          });
          // If there's a refresh_token (from connect-google-ads) but the scope
          // was just overwritten without adwords, restore the full scope
          if (
            existing &&
            existing.refresh_token &&
            existing.scope &&
            !existing.scope.includes("adwords")
          ) {
            // The scope was narrowed by the adapter. We can't recover the exact
            // broad scope, but we know it should include adwords + analytics scopes.
            const broadScope =
              "openid email profile https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics.edit https://www.googleapis.com/auth/adwords";
            await prisma.account.update({
              where: { id: existing.id },
              data: { scope: broadScope },
            });
            console.log("[auth] Restored elevated Google scope after re-login");
          }
        } catch (err) {
          console.error("[auth] scope restoration failed:", err);
        }
      }
    },
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // On initial sign-in, persist user id
      if (user) {
        token.userId = user.id;
      }

      if (account) {
        token.provider = account.provider;
        // Don't store Google OAuth login tokens in the JWT — login no
        // longer requests the analytics scope.  Analytics tokens are
        // loaded from the Account table below so that login and
        // analytics connection are fully decoupled.
      }

      // Detect team membership for this user
      if (token.userId && !token.teamId) {
        try {
          const membership = await prisma.teamMembership.findFirst({
            where: { userId: token.userId as string },
            select: { teamId: true, role: true, team: { select: { ownerId: true } } },
          });
          if (membership) {
            token.teamId = membership.teamId;
            token.teamRole = membership.role;
            token.teamAdminId = membership.team.ownerId;
          }
        } catch (err) {
          console.error("[auth] Team membership lookup failed:", err);
        }
      }

      // Detect org membership for this user (alongside team, for backward compat)
      if (token.userId && !token.activeOrgId) {
        try {
          const orgUser = await prisma.user.findUnique({
            where: { id: token.userId as string },
            select: { activeOrgId: true },
          });
          if (orgUser?.activeOrgId) {
            const org = await prisma.organization.findUnique({
              where: { id: orgUser.activeOrgId },
              select: { id: true, ownerId: true },
            });
            if (org) {
              token.activeOrgId = org.id;
              token.orgOwnerId = org.ownerId;
            }
          } else {
            // Fallback: find org user owns
            const owned = await prisma.organization.findUnique({
              where: { ownerId: token.userId as string },
              select: { id: true, ownerId: true },
            });
            if (owned) {
              token.activeOrgId = owned.id;
              token.orgOwnerId = owned.ownerId;
            } else {
              // Fallback: find org user is a member of
              const membership = await prisma.orgMembership.findFirst({
                where: { userId: token.userId as string },
                select: { org: { select: { id: true, ownerId: true } } },
              });
              if (membership) {
                token.activeOrgId = membership.org.id;
                token.orgOwnerId = membership.org.ownerId;
              }
            }
          }
        } catch (err) {
          console.error("[auth] Org membership lookup failed:", err);
        }
      }

      // Load Google Analytics tokens from the Account table.
      // For team members, load the admin's Google tokens instead.
      // For org members, load the org owner's Google tokens.
      // Only load when a refresh_token is present — that indicates the
      // user completed the analytics connection flow (not just login).
      const tokenOwnerId = token.orgOwnerId || token.teamAdminId || (token.userId as string);
      if (!token.accessToken && tokenOwnerId) {
        try {
          const googleAccount = await prisma.account.findFirst({
            where: { userId: tokenOwnerId, provider: "google" },
            select: { access_token: true, refresh_token: true, expires_at: true },
          });
          if (googleAccount?.access_token && googleAccount.refresh_token) {
            token.accessToken = googleAccount.access_token;
            token.refreshToken = googleAccount.refresh_token;
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
      (session as any).teamId = token.teamId;
      (session as any).teamRole = token.teamRole;
      (session as any).teamAdminId = token.teamAdminId;
      (session as any).activeOrgId = token.activeOrgId;
      (session as any).orgOwnerId = token.orgOwnerId;
      return session;
    },
  },
});
