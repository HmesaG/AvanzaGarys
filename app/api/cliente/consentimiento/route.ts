import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { jsonOk, manejarError, verificarOrigen } from "@/lib/http";
import { registrarConsentimiento } from "@/lib/cliente-queries";
import { Rol } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.CLIENTE);
    const programa = await registrarConsentimiento(usuario.clienteId!);
    return jsonOk({ programa });
  } catch (error) {
    return manejarError(error);
  }
}
