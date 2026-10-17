import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { jsonOk, manejarError, jsonError } from "@/lib/http";
import { db } from "@/lib/prisma";
import { Rol, EstadoCita } from "@/generated/prisma/client";

/**
 * GET: Directorio de coaches con balance de carga (caseload) y clientes sin asignar.
 */
export async function GET() {
  try {
    await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);

    const [coachesDb, sinAsignarDb] = await Promise.all([
      db.usuario.findMany({
        where: { rol: Rol.COACH },
        orderBy: { nombre: "asc" },
        select: {
          id: true,
          nombre: true,
          email: true,
          activo: true,
          clientesAsignados: {
            where: { usuario: { activo: true } },
            select: {
              id: true,
              linea: true,
              telefono: true,
              usuario: {
                select: {
                  nombre: true,
                  email: true,
                },
              },
            },
          },
          citasComoCoach: {
            select: {
              id: true,
              estado: true,
            },
          },
        },
      }),
      db.cliente.findMany({
        where: { coachId: null, usuario: { activo: true } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          linea: true,
          telefono: true,
          usuario: {
            select: {
              nombre: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const coaches = coachesDb.map((coach) => {
      const coacheesActivos = coach.clientesAsignados.length;
      const citasCompletadas = coach.citasComoCoach.filter(
        (c) => c.estado === EstadoCita.COMPLETADA,
      ).length;
      const citasPendientes = coach.citasComoCoach.filter(
        (c) => c.estado === EstadoCita.CONFIRMADA || c.estado === EstadoCita.PENDIENTE,
      ).length;

      return {
        id: coach.id,
        nombre: coach.nombre,
        email: coach.email,
        activo: coach.activo,
        coacheesActivos,
        citasCompletadas,
        citasPendientes,
        clientes: coach.clientesAsignados.map((c) => ({
          id: c.id,
          linea: c.linea,
          telefono: c.telefono,
          nombre: c.usuario.nombre,
          email: c.usuario.email,
        })),
      };
    });

    const sinAsignar = sinAsignarDb.map((c) => ({
      id: c.id,
      linea: c.linea,
      telefono: c.telefono,
      nombre: c.usuario.nombre,
      email: c.usuario.email,
    }));

    return jsonOk({ coaches, sinAsignar });
  } catch (error) {
    return manejarError(error);
  }
}

/**
 * PATCH: Reasignación de un coachee a un coach (o remoción de asignación).
 * Exclusivo de ADMINISTRADOR y SECRETARIA.
 */
export async function PATCH(request: NextRequest) {
  try {
    await requireRole(Rol.ADMINISTRADOR, Rol.SECRETARIA);

    const body = await request.json().catch(() => null);
    if (!body || typeof body.clienteId !== "string") {
      return jsonError(400, "clienteId es requerido");
    }

    const { clienteId, coachId } = body;

    // Si viene coachId, verificar que el usuario exista y sea COACH
    if (coachId) {
      const coach = await db.usuario.findUnique({
        where: { id: coachId },
        select: { id: true, rol: true },
      });
      if (!coach || coach.rol !== Rol.COACH) {
        return jsonError(400, "El usuario asignado debe ser un coach válido");
      }
    }

    const clienteActualizado = await db.cliente.update({
      where: { id: clienteId },
      data: { coachId: coachId || null },
      select: {
        id: true,
        coachId: true,
        usuario: { select: { nombre: true } },
      },
    });

    return jsonOk({
      mensaje: "Asignación actualizada correctamente",
      cliente: clienteActualizado,
    });
  } catch (error) {
    return manejarError(error);
  }
}
