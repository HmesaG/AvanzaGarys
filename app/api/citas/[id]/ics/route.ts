import { NextRequest } from "next/server";
import { requireSesion } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { generarIcs } from "@/lib/calendario-sync";
import { manejarError, ApiError } from "@/lib/http";
import { Rol } from "@/generated/prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const usuario = await requireSesion();
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

    // Autorización: Debe ser el cliente de la cita, el coach asignado, o Administrador/Secretaria
    const esSuCitaCliente = usuario.clienteId && cita.clienteId === usuario.clienteId;
    const esSuCitaCoach = usuario.id === cita.coachId;
    const esStaffAdmin =
      usuario.rol === Rol.ADMINISTRADOR || usuario.rol === Rol.SECRETARIA;

    if (!esSuCitaCliente && !esSuCitaCoach && !esStaffAdmin) {
      throw new ApiError(403, "No tienes permiso para acceder a esta cita", "sin_permiso");
    }

    const modalidadVirtual = cita.modalidad === "Virtual";
    const enlaceVirtual = modalidadVirtual
      ? `https://meet.jit.si/Avanza-Coaching-${cita.id}`
      : "Oficinas AvanzA Coaching";

    const descripcion = [
      `Sesión de Coaching AvanzA (${cita.modalidad})`,
      `Coachee: ${cita.cliente.usuario.nombre}`,
      cita.coach ? `Coach: ${cita.coach.nombre}` : "",
      modalidadVirtual ? `Enlace de Videollamada: ${enlaceVirtual}` : "",
      cita.notas ? `Acuerdos previos: ${cita.notas}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const contenidoIcs = generarIcs({
      id: cita.id,
      titulo: `Sesión de Coaching AvanzA - ${cita.cliente.usuario.nombre}`,
      descripcion,
      ubicacion: enlaceVirtual,
      fechaInicio: new Date(cita.fecha),
      duracionMinutos: 60,
    });

    return new Response(contenidoIcs, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="sesion-avanza-${cita.id.slice(-6)}.ics"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return manejarError(error);
  }
}
