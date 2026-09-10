import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, jsonOk, leerJson, manejarError, verificarOrigen } from "@/lib/http";
import { listarCitas } from "@/lib/admin-queries";
import { db } from "@/lib/prisma";
import { fechaValida, textoOpcional } from "@/lib/validacion";
import { ROLES_STAFF } from "@/lib/autorizacion";
import { Rol } from "@/generated/prisma/client";

const MODALIDADES = ["Virtual", "Presencial"] as const;

function inicioDelDia(fecha = new Date()): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

/**
 * Citas en un rango. Por defecto, las de hoy (es lo que necesita el dashboard).
 * `?mias=1` acota a las del coach autenticado.
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);
    const params = request.nextUrl.searchParams;

    const desdeParam = params.get("desde");
    const hastaParam = params.get("hasta");
    const desde = desdeParam ? fechaValida(desdeParam, "desde") : inicioDelDia();
    const hasta = hastaParam
      ? fechaValida(hastaParam, "hasta")
      : new Date(desde.getTime() + 24 * 60 * 60 * 1000);

    if (hasta <= desde) {
      throw new ApiError(400, '"hasta" debe ser posterior a "desde"', "campo_invalido");
    }

    const citas = await listarCitas({
      desde,
      hasta,
      clienteId: params.get("clienteId") ?? undefined,
      coachId: params.get("mias") === "1" ? usuario.id : undefined,
    });

    return jsonOk({ citas, rango: { desde, hasta } });
  } catch (error) {
    return manejarError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);

    const cuerpo = await leerJson(request);
    const clienteId = textoOpcional(cuerpo.clienteId, "clienteId", { max: 40 });
    if (!clienteId) {
      throw new ApiError(400, 'El campo "clienteId" es obligatorio', "campo_invalido");
    }

    const fecha = fechaValida(cuerpo.fecha, "fecha");
    const notas = textoOpcional(cuerpo.notas, "notas", { max: 2000 });

    const modalidad = cuerpo.modalidad === undefined ? "Virtual" : cuerpo.modalidad;
    if (!MODALIDADES.includes(modalidad as (typeof MODALIDADES)[number])) {
      throw new ApiError(400, "La modalidad debe ser Virtual o Presencial", "campo_invalido");
    }

    const cliente = await db.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true, coachId: true },
    });
    if (!cliente) {
      throw new ApiError(404, "El cliente no existe", "no_encontrado");
    }

    // Un COACH sólo se agenda a sí mismo; ADMINISTRADOR y SECRETARIA pueden
    // agendar a cualquier miembro del staff.
    let coachId: string | null;
    if (usuario.rol === Rol.COACH) {
      coachId = usuario.id;
    } else {
      const solicitado = textoOpcional(cuerpo.coachId, "coachId", { max: 40 });
      coachId = solicitado ?? cliente.coachId;

      if (solicitado) {
        const coach = await db.usuario.findUnique({
          where: { id: solicitado },
          select: { id: true, rol: true, activo: true },
        });
        if (!coach || !coach.activo || !ROLES_STAFF.includes(coach.rol)) {
          throw new ApiError(400, "El coach indicado no es válido", "campo_invalido");
        }
      }
    }

    const cita = await db.cita.create({
      data: {
        clienteId: cliente.id,
        coachId,
        fecha,
        modalidad: modalidad as string,
        notas,
      },
      select: {
        id: true,
        fecha: true,
        modalidad: true,
        estado: true,
        notas: true,
        cliente: { select: { id: true, usuario: { select: { nombre: true } } } },
        coach: { select: { id: true, nombre: true } },
      },
    });

    return jsonOk({ cita }, 201);
  } catch (error) {
    return manejarError(error);
  }
}
