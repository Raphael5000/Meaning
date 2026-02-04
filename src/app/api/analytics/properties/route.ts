import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listProperties } from "@/lib/ga4";

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const properties = await listProperties(session.accessToken);
    return NextResponse.json({ properties });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch properties";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
