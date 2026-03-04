import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listProperties } from "@/lib/ga4";
import { getGoogleAccessToken } from "@/lib/google-token";
import { getAllowedPropertyIds } from "@/lib/team-access";

export async function GET() {
  const session = await auth();
  const accessToken = await getGoogleAccessToken(
    session as { accessToken?: string; userId?: string; teamAdminId?: string } | null
  );

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    let properties = await listProperties(accessToken);

    // Filter properties for team members
    const userId = (session as { userId?: string })?.userId;
    if (userId) {
      const allowed = await getAllowedPropertyIds(userId);
      if (allowed !== "all") {
        properties = properties.filter((p: { propertyId: string }) =>
          allowed.includes(p.propertyId)
        );
      }
    }

    return NextResponse.json({ properties });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch properties";
    const body =
      error &&
      typeof error === "object" &&
      "body" in error &&
      typeof (error as { body?: unknown }).body === "object"
        ? (error as { body: unknown }).body
        : undefined;
    return NextResponse.json(
      { error: message, details: body },
      { status: 500 }
    );
  }
}
