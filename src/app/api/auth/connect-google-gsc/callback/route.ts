import { NextRequest, NextResponse } from "next/server";
import https from "node:https";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Make a POST request using Node.js native https module.
 */
function httpsPost(
  url: string,
  body: string,
  timeoutMs = 25_000,
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: timeoutMs,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: string) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve({
              ok: res.statusCode! >= 200 && res.statusCode! < 300,
              status: res.statusCode!,
              body: parsed,
            });
          } catch {
            reject(new Error(`Invalid JSON from Google: ${data.slice(0, 200)}`));
          }
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Google token exchange timed out"));
    });
    req.write(body);
    req.end();
  });
}

/**
 * GET /api/auth/connect-google-gsc/callback
 *
 * Handles the OAuth callback for the webmasters.readonly scope.
 * Updates the existing Account record with the new (broader-scoped) tokens.
 */
export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL("/?error=gsc_oauth_denied", baseUrl)
    );
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("gsc_connect_state")?.value;
  cookieStore.delete("gsc_connect_state");

  if (!state || state !== storedState) {
    return NextResponse.redirect(
      new URL("/?error=invalid_state", baseUrl)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?error=no_code", baseUrl)
    );
  }

  try {
    const tokenBody = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${baseUrl}/api/auth/connect-google-gsc/callback`,
      grant_type: "authorization_code",
    });

    const tokenRes = await httpsPost(
      "https://oauth2.googleapis.com/token",
      tokenBody.toString(),
    );

    if (!tokenRes.ok) {
      console.error("[connect-google-gsc] Token exchange failed:", tokenRes.body);
      return NextResponse.redirect(
        new URL("/?error=token_failed", baseUrl)
      );
    }

    const tokens = tokenRes.body;

    const idTokenParts = (tokens.id_token as string).split(".");
    const idTokenPayload = JSON.parse(
      Buffer.from(idTokenParts[1], "base64url").toString()
    );
    const googleUserId = idTokenPayload.sub as string;

    // Update the existing Account with the broader-scoped tokens (now includes webmasters)
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: googleUserId,
        },
      },
      update: {
        access_token: tokens.access_token as string,
        refresh_token: (tokens.refresh_token as string) ?? undefined,
        expires_at: tokens.expires_in
          ? Math.floor(Date.now() / 1000 + (tokens.expires_in as number))
          : undefined,
        token_type: tokens.token_type as string,
        scope: tokens.scope as string,
        id_token: tokens.id_token as string,
      },
      create: {
        userId,
        type: "oauth",
        provider: "google",
        providerAccountId: googleUserId,
        access_token: tokens.access_token as string,
        refresh_token: tokens.refresh_token as string,
        expires_at: tokens.expires_in
          ? Math.floor(Date.now() / 1000 + (tokens.expires_in as number))
          : undefined,
        token_type: tokens.token_type as string,
        scope: tokens.scope as string,
        id_token: tokens.id_token as string,
      },
    });

    return NextResponse.redirect(
      new URL("/?gsc_connected=true", baseUrl)
    );
  } catch (err) {
    console.error("[connect-google-gsc] Error:", err);
    return NextResponse.redirect(
      new URL("/?error=unknown", baseUrl)
    );
  }
}
