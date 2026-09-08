import type { NextRequest } from "next/server";
import { cerrarSesion } from "@/lib/auth";
import { jsonOk, manejarError, verificarOrigen } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    verificarOrigen(request);
    // Idempotente: sin sesión activa también responde 200. Así el frontend puede
    // "cerrar sesión" sin manejar el caso de la cookie ya vencida.
    await cerrarSesion();
    return jsonOk({ ok: true });
  } catch (error) {
    return manejarError(error);
  }
}
