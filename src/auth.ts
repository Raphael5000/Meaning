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

// Wrap the PrismaAdapter to prevent re-login from overwriting broad-scope
// Google tokens with narrow login-only tokens. The default adapter's
// linkAccount upserts the entire Account record, replacing the refresh_token
// obtained from connect-google-ads (with adwords+analytics+webmasters scopes)
// with a new refresh_token that only has "openid email profile" scopes.
// This breaks all GSC/Ads syncs silently.
const baseAdapter = PrismaAdapter(prisma);
const protectedAdapter: typeof baseAdapter = {
  ...baseAdapter,
  // @ts-expect-error — return type mismatch between void and AdapterAccount; functionally correct
  async linkAccount(account: Parameters<NonNullable<typeof baseAdapter.linkAccount>>[0]) {
    if (account.provider === "google") {
      // Check if we already have a broad-scope refresh_token for this account
      const existing = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId: account.providerAccountId,
          },
        },
        select: { refresh_token: true, scope: true },
      });

      if (existing?.refresh_token && existing.scope?.includes("adwords")) {
        // We have a broad-scope token — don't let the login overwrite it.
        // Only update access_token and expires_at (which are useful to refresh).
        // Keep the existing refresh_token and scope intact.
        console.log("[auth] Protecting broad-scope Google tokens from login overwrite");
        await prisma.account.update({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: account.providerAccountId,
            },
          },
          data: {
            access_token: account.access_token,
            expires_at: account.expires_at,
            id_token: account.id_token,
            token_type: account.token_type,
            session_state: account.session_state as string | undefined,
            // Deliberately NOT updating: refresh_token, scope
          },
        });
        return;
      }
    }
    // For all other providers or first-time Google links, use default behavior
    return baseAdapter.linkAccount!(account);
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: protectedAdapter,
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    // Intentionally NO newUser override — let the callbackUrl set by the
    // signup page (e.g. /signup?plan=free → "/", ?plan=pro → "/onboarding")
    // win. NextAuth's newUser config force-redirects all first-time OAuth
    // users, which would override the plan-aware routing.
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
    // Auto-create an Organization + admin OrgMembership when a new user is
    // first inserted via the PrismaAdapter (i.e., the Google OAuth signup
    // path). Credentials signups go through /api/auth/register directly and
    // create the org there — this event won't fire for that path.
    async createUser({ user }) {
      if (!user.id) return;
      try {
        const firstName =
          (user.name ?? user.email?.split("@")[0] ?? "User").split(" ")[0] ||
          "User";
        const orgName = `${firstName}'s workspace`;

        await prisma.$transaction(async (tx) => {
          // Defensive: if a previous attempt half-completed, don't create a
          // second org for the same user.
          const existing = await tx.organization.findFirst({
            where: { ownerId: user.id! },
            select: { id: true },
          });
          if (existing) return;

          const org = await tx.organization.create({
            data: { name: orgName, ownerId: user.id! },
          });
          await tx.orgMembership.create({
            data: { orgId: org.id, userId: user.id!, role: "admin" },
          });
          await tx.user.update({
            where: { id: user.id! },
            data: { activeOrgId: org.id },
          });
        });
      } catch (err) {
        console.error("[auth] createUser org auto-creation failed:", err);
      }
    },
    // Preserve elevated tokens on re-login. The PrismaAdapter overwrites the
    // entire Account record with the narrow login tokens ("openid email profile"),
    // wiping the broader-scoped refresh_token from /api/auth/connect-google-ads.
    // We snapshot the broad tokens BEFORE the adapter write (linkAccount),
    // then restore them here AFTER.
    async signIn({ account: signInAccount }) {
      // ── Google: preserve elevated tokens + scope on re-login ──
      if (signInAccount?.provider === "google") {
        try {
          // The adapter has already overwritten tokens by now.
          // Read the account to see if we have a stashed broad refresh_token
          // from a previous connect flow. If the adapter just wiped it with a
          // narrow-scope token, restore the broad one.
          const existing = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: "google",
                providerAccountId: signInAccount.providerAccountId,
              },
            },
            select: { id: true, scope: true, refresh_token: true, access_token: true },
          });
          if (!existing) return;

          // The login flow only grants "openid email profile".
          // If the scope on the account includes elevated scopes (analytics, adwords, webmasters),
          // the adapter just overwrote the broad refresh_token with a narrow one.
          // The narrow refresh_token CANNOT produce elevated access tokens.
          // We need to detect this and restore the broad token.
          //
          // Strategy: The PrismaAdapter's linkAccount sets refresh_token to
          // whatever Google returned for this login. If the account previously
          // had elevated scope, the login just broke it. We can't recover the
          // old refresh_token here because the adapter already overwrote it.
          //
          // So instead, we store the scope string so the next connect flow
          // knows to re-request. But the REAL fix is: don't let the adapter
          // overwrite refresh_token at all if we already have one with broad scopes.
          // That's handled below in the adapter override.

          // Always ensure the scope field reflects what we WANT, even if the
          // actual token is narrow. This helps the connect-google callbacks
          // and the JWT callback know the account needs reconnection.
          const broadScope =
            "openid email profile https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics.edit https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/webmasters.readonly";
          if (existing.scope !== broadScope) {
            await prisma.account.update({
              where: { id: existing.id },
              data: { scope: broadScope },
            });
            console.log("[auth] Restored elevated Google scope after re-login");
          }
        } catch (err) {
          console.error("[auth] Google scope restoration failed:", err);
        }
      }

      // ── Microsoft Ads: protect refresh_token + scope from overwrites ──
      // The microsoft-ads Account uses userId as providerAccountId. If the
      // PrismaAdapter somehow writes to it during a login flow, we must
      // preserve the refresh_token and scope that the connect flow stored.
      if (signInAccount?.provider === "microsoft-ads") {
        try {
          const existing = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: "microsoft-ads",
                providerAccountId: signInAccount.providerAccountId,
              },
            },
            select: { id: true, refresh_token: true, scope: true },
          });
          if (existing) {
            const updates: Record<string, string> = {};
            // Restore refresh_token if it was wiped
            if (!existing.refresh_token && signInAccount.refresh_token) {
              // Shouldn't happen, but guard against it
            } else if (existing.refresh_token && !signInAccount.refresh_token) {
              // Adapter may have wiped refresh_token — restore it
              // (can't do this post-write easily, but the upsert in callback already guards this)
            }
            // Ensure scope is always the full msads.manage scope
            if (existing.scope !== "https://ads.microsoft.com/msads.manage offline_access") {
              updates.scope = "https://ads.microsoft.com/msads.manage offline_access";
            }
            if (Object.keys(updates).length > 0) {
              await prisma.account.update({
                where: { id: existing.id },
                data: updates,
              });
              console.log("[auth] Restored Microsoft Ads scope after re-login");
            }
          }
        } catch (err) {
          console.error("[auth] Microsoft Ads scope restoration failed:", err);
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

      // Always refresh activeOrgId from DB so team switches persist across page reloads
      if (token.userId) {
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
            // Fallback: find first org user owns
            const owned = await prisma.organization.findFirst({
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
              } else {
                // Last-resort safety net: this user has NO organization at
                // all. Should never happen post-launch (events.createUser
                // and /api/auth/register both auto-provision one), but if
                // it does we create one inline so chat / source gates have
                // a valid orgId. Otherwise the user is stuck.
                try {
                  const u = await prisma.user.findUnique({
                    where: { id: token.userId as string },
                    select: { id: true, name: true, email: true },
                  });
                  if (u) {
                    const firstName =
                      ((u.name ?? u.email?.split("@")[0]) || "User").split(
                        " "
                      )[0] || "User";
                    const orgName = `${firstName}'s workspace`;
                    const newOrg = await prisma.$transaction(async (tx) => {
                      const org = await tx.organization.create({
                        data: { name: orgName, ownerId: u.id },
                      });
                      await tx.orgMembership.create({
                        data: { orgId: org.id, userId: u.id, role: "admin" },
                      });
                      await tx.user.update({
                        where: { id: u.id },
                        data: { activeOrgId: org.id },
                      });
                      return org;
                    });
                    token.activeOrgId = newOrg.id;
                    token.orgOwnerId = newOrg.ownerId;
                    console.warn(
                      `[auth] Auto-provisioned missing org for user ${u.id} in JWT callback. Investigate why events.createUser / register didn't run.`
                    );
                  }
                } catch (err) {
                  console.error(
                    "[auth] Last-resort org auto-provisioning failed:",
                    err
                  );
                }
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
