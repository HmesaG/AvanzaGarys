import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { jsonOk, manejarError, ApiError, verificarOrigen } from "@/lib/http";
import {
  crearDiagnosticoDeportivo,
  obtenerDiagnosticoDeportivo,
  type DatosDiagnosticoDeportivo,
} from "@/lib/cliente-queries";
import { Rol } from "@/generated/prisma/client";

export async function GET() {
  try {
    const usuario = await requireRole(Rol.CLIENTE);
    const diagnostico = await obtenerDiagnosticoDeportivo(usuario.clienteId!);
    return jsonOk({ diagnostico });
  } catch (error) {
    return manejarError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.CLIENTE);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new ApiError(400, "Cuerpo inválido", "cuerpo_invalido");
    }

    const {
      disciplina,
      categoria,
      metaCompetitiva,
      bloqueoMental,
      nivelDescansoNutricion,
      horasEntrenamientoSemana,
    } = body as Record<string, unknown>;

    if (
      typeof disciplina !== "string" ||
      typeof categoria !== "string" ||
      typeof metaCompetitiva !== "string" ||
      typeof bloqueoMental !== "string" ||
      typeof nivelDescansoNutricion !== "string" ||
      !disciplina.trim() ||
      !categoria.trim() ||
      !metaCompetitiva.trim() ||
      !bloqueoMental.trim() ||
      !nivelDescansoNutricion.trim()
    ) {
      throw new ApiError(400, "Todos los campos deportivos son obligatorios", "campo_invalido");
    }

    const horas = typeof horasEntrenamientoSemana === "number" ? horasEntrenamientoSemana : parseInt(String(horasEntrenamientoSemana || 10), 10);

    const datos: DatosDiagnosticoDeportivo = {
      disciplina: disciplina.trim().slice(0, 255),
      categoria: categoria.trim().slice(0, 255),
      metaCompetitiva: metaCompetitiva.trim(),
      bloqueoMental: bloqueoMental.trim(),
      nivelDescansoNutricion: nivelDescansoNutricion.trim().slice(0, 100),
      horasEntrenamientoSemana: isNaN(horas) || horas < 1 ? 10 : horas,
    };

    const diagnostico = await crearDiagnosticoDeportivo(usuario.clienteId!, datos);
    return jsonOk({ diagnostico }, 201);
  } catch (error) {
    return manejarError(error);
  }
}
