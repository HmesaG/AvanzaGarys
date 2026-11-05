import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { ApiError, jsonOk, leerJson, manejarError, verificarOrigen } from "@/lib/http";
import { textoOpcional } from "@/lib/validacion";
import { EstadoCita, Rol } from "@/generated/prisma/client";

const DIAS_VALIDOS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export async function GET() {
  try {
    const usuario = await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);

    const ahora = new Date();
    const inicioDeMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioMesSiguiente = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);

    const [perfil, sesionesCompletadasMes] = await Promise.all([
      db.usuario.findUnique({
        where: { id: usuario.id },
        select: {
          esquemaHonorario: true,
          valorHonorario: true,
          disponibilidadJson: true,
        },
      }),
      db.cita.count({
        where: {
          coachId: usuario.id,
          estado: EstadoCita.COMPLETADA,
          fecha: { gte: inicioDeMes, lt: inicioMesSiguiente },
        },
      }),
    ]);

    return jsonOk({
      esquemaHonorario: perfil?.esquemaHonorario ?? "SIN_DEFINIR",
      valorHonorario: perfil?.valorHonorario !== null && perfil?.valorHonorario !== undefined
        ? Number(perfil.valorHonorario)
        : null,
      disponibilidad: perfil?.disponibilidadJson ?? null,
      sesionesCompletadasMes,
    });
  } catch (error) {
    return manejarError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.ADMINISTRADOR, Rol.COACH);
    const cuerpo = await leerJson(request);

    const diasInput = Array.isArray(cuerpo.dias) ? cuerpo.dias : [];
    const dias = diasInput.filter(
      (d): d is string =>
        typeof d === "string" &&
        DIAS_VALIDOS.includes(d as (typeof DIAS_VALIDOS)[number]),
    );

    const horaInicio =
      typeof cuerpo.horaInicio === "string" && /^\d{2}:\d{2}$/.test(cuerpo.horaInicio)
        ? cuerpo.horaInicio
        : "09:00";
    const horaFin =
      typeof cuerpo.horaFin === "string" && /^\d{2}:\d{2}$/.test(cuerpo.horaFin)
        ? cuerpo.horaFin
        : "18:00";
    const modalidadPreferida =
      cuerpo.modalidadPreferida === "Presencial" || cuerpo.modalidadPreferida === "Ambas"
        ? cuerpo.modalidadPreferida
        : "Virtual";
    const notaHorario = textoOpcional(cuerpo.notaHorario, "notaHorario", { max: 500 });

    const disponibilidad = {
      dias,
      horaInicio,
      horaFin,
      modalidadPreferida,
      notaHorario,
      actualizadoEn: new Date().toISOString(),
    };

    await db.usuario.update({
      where: { id: usuario.id },
      data: { disponibilidadJson: disponibilidad },
    });

    return jsonOk({
      mensaje: "Disponibilidad actualizada correctamente",
      disponibilidad,
    });
  } catch (error) {
    if (error instanceof ApiError) return manejarError(error);
    return manejarError(error);
  }
}
