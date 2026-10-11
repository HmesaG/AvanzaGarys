import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { jsonOk, manejarError, verificarOrigen } from "@/lib/http";
import { iniciarPlan, obtenerPlanActivo } from "@/lib/grow-queries";
import { Rol } from "@/generated/prisma/client";

export async function GET() {
  try {
    const usuario = await requireRole(Rol.CLIENTE);
    const plan = await obtenerPlanActivo(usuario.clienteId!);
    return jsonOk({ plan });
  } catch (error) {
    return manejarError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.CLIENTE);
    const plan = await iniciarPlan(usuario.clienteId!);
    return jsonOk({ plan }, 201);
  } catch (error) {
    return manejarError(error);
  }
}
