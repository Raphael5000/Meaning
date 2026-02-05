import { NextResponse } from "next/server";
import { handlers } from "@/auth";

export const { GET, POST } = handlers;

// Auth.js only supports GET and POST. Respond to OPTIONS (e.g. proxy/CORS) so it doesn't log UnknownAction or cause 502.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
