import { NextResponse } from "next/server";

// Ahrefs was removed from Meaning on 16 Nov 2026 (the subscription was cancelled).
// Nothing connects or syncs it any more; existing data sources are DISCONNECTED.
export const dynamic = "force-dynamic";

const gone = () => NextResponse.json({ error: "Ahrefs is no longer offered." }, { status: 410 });

export async function POST() {
  return gone();
}
