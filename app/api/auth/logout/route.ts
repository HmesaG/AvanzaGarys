import { destroySession } from "@/lib/server/session";
import { csrfErrorResponse } from "@/lib/server/csrf";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const csrfError = csrfErrorResponse(request);
  if (csrfError) return csrfError;

  await destroySession();
  return Response.json({ ok: true });
}
