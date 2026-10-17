import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { jsonOk, leerJson, manejarError, verificarOrigen, ApiError } from "@/lib/http";
import { Rol, EstadoCita } from "@/generated/prisma/client";
import { fechaValida, textoOpcional } from "@/lib/validacion";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);
    const { id } = await params;

    const cita = await db.cita.findUnique({
      where: { id },
      include: {
        cliente: {
          include: {
            usuario: { select: { nombre: true, email: true } },
          },
        },
        coach: { select: { id: true, nombre: true, email: true } },
      },
    });

    if (!cita) {
      throw new ApiError(404, "Cita no encontrada", "no_encontrado");
    }

    return jsonOk({ cita });
  } catch (error) {
    return manejarError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);
    const { id } = await params;
    const cuerpo = await leerJson(request);

    const citaExistente = await db.cita.findUnique({
      where: { id },
      select: { id: true, coachId: true },
    });
    if (!citaExistente) {
      throw new ApiError(404, "Cita no encontrada", "no_encontrado");
    }

    if (usuario.rol === Rol.COACH && citaExistente.coachId && citaExistente.coachId !== usuario.id) {
      throw new ApiError(403, "No tienes permiso para modificar esta cita", "sin_permiso");
    }

    const data: {
      enlaceReunion?: string | null;
      estado?: EstadoCita;
      modalidad?: string;
      notas?: string | null;
      fecha?: Date;
    } = {};

    if (cuerpo.enlaceReunion !== undefined) {
      data.enlaceReunion = textoOpcional(cuerpo.enlaceReunion, "enlaceReunion", { max: 1000 });
    }

    if (cuerpo.estado !== undefined) {
      if (typeof cuerpo.estado !== "string" || !Object.values(EstadoCita).includes(cuerpo.estado as EstadoCita)) {
        throw new ApiError(400, "Estado de cita inválido", "campo_invalido");
      }
      data.estado = cuerpo.estado as EstadoCita;
    }

    if (cuerpo.modalidad !== undefined) {
      if (cuerpo.modalidad !== "Virtual" && cuerpo.modalidad !== "Presencial") {
        throw new ApiError(400, "Modalidad debe ser Virtual o Presencial", "campo_invalido");
      }
      data.modalidad = cuerpo.modalidad;
    }

    if (cuerpo.notas !== undefined) {
      data.notas = textoOpcional(cuerpo.notas, "notas", { max: 5000 });
    }

    if (cuerpo.fecha !== undefined) {
      data.fecha = fechaValida(cuerpo.fecha, "fecha");
    }

    const cita = await db.cita.update({
      where: { id },
      data,
      include: {
        cliente: {
          include: {
            usuario: { select: { nombre: true, email: true } },
          },
        },
        coach: { select: { id: true, nombre: true } },
      },
    });

    return jsonOk({ cita });
  } catch (error) {
    return manejarError(error);
  }
}
