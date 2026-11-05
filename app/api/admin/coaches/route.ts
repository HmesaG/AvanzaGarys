import { NextRequest } from "next/server";
import { hashearPassword, requireRole } from "@/lib/auth";
import { jsonOk, manejarError, verificarOrigen, leerJson, ApiError } from "@/lib/http";
import { db } from "@/lib/prisma";
import { emailValido, passwordValida, textoRequerido } from "@/lib/validacion";
import { Rol, EstadoCita, EstadoPago, EsquemaHonorario } from "@/generated/prisma/client";

const ESQUEMAS_VALIDOS = Object.values(EsquemaHonorario);

function validarEsquemaHonorario(valor: unknown): EsquemaHonorario {
  if (typeof valor === "string" && ESQUEMAS_VALIDOS.includes(valor as EsquemaHonorario)) {
    return valor as EsquemaHonorario;
  }
  return EsquemaHonorario.SIN_DEFINIR;
}

function parsearValorHonorario(
  esquema: EsquemaHonorario,
  valor: unknown,
): number | null {
  if (esquema === EsquemaHonorario.SIN_DEFINIR) return null;
  const num = Number(valor);
  if (!Number.isFinite(num) || num < 0) {
    throw new ApiError(400, "El valor de honorario/comisión debe ser un número válido", "campo_invalido");
  }
  if (esquema === EsquemaHonorario.PORCENTAJE && num > 100) {
    throw new ApiError(400, "El porcentaje de comisión no puede superar el 100%", "campo_invalido");
  }
  return Math.round(num * 100) / 100;
}

/**
 * GET: Directorio de coaches (miembros externos) con balance de carga,
 * acuerdo de honorarios/comisiones y clientes sin asignar.
 */
export async function GET() {
  try {
    const usuario = await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);

    const ahora = new Date();
    const inicioDeMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioMesSiguiente = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);

    const esCoachExterno = usuario.rol === Rol.COACH;

    const [coachesDb, sinAsignarDb] = await Promise.all([
      db.usuario.findMany({
        where: {
          rol: Rol.COACH,
          ...(esCoachExterno ? { id: usuario.id } : {}),
        },
        orderBy: { nombre: "asc" },
        select: {
          id: true,
          nombre: true,
          email: true,
          activo: true,
          esquemaHonorario: true,
          valorHonorario: true,
          disponibilidadJson: true,
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
              pagos: {
                where: {
                  estado: EstadoPago.PAGADO,
                  OR: [
                    { fechaPago: { gte: inicioDeMes, lt: inicioMesSiguiente } },
                    { fechaPago: null, updatedAt: { gte: inicioDeMes, lt: inicioMesSiguiente } },
                  ],
                },
                select: {
                  monto: true,
                },
              },
            },
          },
          citasComoCoach: {
            select: {
              id: true,
              estado: true,
              fecha: true,
            },
          },
        },
      }),
      esCoachExterno
        ? Promise.resolve([])
        : db.cliente.findMany({
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
      const citasCompletadasMes = coach.citasComoCoach.filter(
        (c) =>
          c.estado === EstadoCita.COMPLETADA &&
          c.fecha >= inicioDeMes &&
          c.fecha < inicioMesSiguiente,
      ).length;
      const citasPendientes = coach.citasComoCoach.filter(
        (c) => c.estado === EstadoCita.CONFIRMADA || c.estado === EstadoCita.PENDIENTE,
      ).length;

      const recaudadoBruto = coach.clientesAsignados.reduce(
        (accCliente, cliente) =>
          accCliente +
          cliente.pagos.reduce((accPago, p) => accPago + Number(p.monto), 0),
        0,
      );
      const recaudadoMes = Math.round(recaudadoBruto * 100) / 100;

      const valorHon =
        coach.valorHonorario !== null && coach.valorHonorario !== undefined
          ? Number(coach.valorHonorario)
          : null;

      let liquidacionEstimadaMes: number | null = null;
      if (coach.esquemaHonorario === EsquemaHonorario.PORCENTAJE) {
        liquidacionEstimadaMes =
          Math.round(recaudadoMes * ((valorHon ?? 0) / 100) * 100) / 100;
      } else if (coach.esquemaHonorario === EsquemaHonorario.FIJO_POR_SESION) {
        liquidacionEstimadaMes =
          Math.round(citasCompletadasMes * (valorHon ?? 0) * 100) / 100;
      } else if (coach.esquemaHonorario === EsquemaHonorario.FIJO_MENSUAL) {
        liquidacionEstimadaMes = valorHon ?? 0;
      }

      return {
        id: coach.id,
        nombre: coach.nombre,
        email: coach.email,
        activo: coach.activo,
        esquemaHonorario: coach.esquemaHonorario,
        valorHonorario: valorHon,
        disponibilidad: coach.disponibilidadJson ?? null,
        coacheesActivos,
        citasCompletadas,
        citasCompletadasMes,
        citasPendientes,
        // El miembro externo nunca ve la recaudación bruta del dueño
        recaudadoMes: esCoachExterno ? 0 : recaudadoMes,
        liquidacionEstimadaMes: esCoachExterno ? null : liquidacionEstimadaMes,
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

    return jsonOk({ coaches, sinAsignar, rolActual: usuario.rol });
  } catch (error) {
    return manejarError(error);
  }
}

/**
 * POST: Alta de nuevo Miembro Externo (Coach Asociado) con acuerdo de pago/comisión.
 * Exclusivo de ADMINISTRADOR (Dueño).
 */
export async function POST(request: NextRequest) {
  try {
    verificarOrigen(request);
    await requireRole(Rol.ADMINISTRADOR);

    const body = await leerJson(request);
    const nombre = textoRequerido(body.nombre, "nombre", { min: 3, max: 120 });
    const email = emailValido(body.email);
    const password = passwordValida(body.password || "Avanza2026!");
    const esquemaHonorario = validarEsquemaHonorario(body.esquemaHonorario);
    const valorHonorario = parsearValorHonorario(esquemaHonorario, body.valorHonorario);

    const existente = await db.usuario.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existente) {
      throw new ApiError(409, "Ya existe un usuario con ese correo electrónico", "email_en_uso");
    }

    const passwordHash = await hashearPassword(password);

    const nuevoCoach = await db.usuario.create({
      data: {
        nombre,
        email,
        passwordHash,
        rol: Rol.COACH,
        activo: true,
        esquemaHonorario,
        valorHonorario,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        esquemaHonorario: true,
        valorHonorario: true,
      },
    });

    return jsonOk(
      {
        mensaje: "Miembro externo creado correctamente",
        coach: {
          ...nuevoCoach,
          valorHonorario:
            nuevoCoach.valorHonorario !== null ? Number(nuevoCoach.valorHonorario) : null,
        },
      },
      201,
    );
  } catch (error) {
    return manejarError(error);
  }
}

/**
 * PUT: Actualización del acuerdo de honorarios/comisión o estado activo de un Miembro Externo.
 * Exclusivo de ADMINISTRADOR (Dueño).
 */
export async function PUT(request: NextRequest) {
  try {
    verificarOrigen(request);
    await requireRole(Rol.ADMINISTRADOR);

    const body = await leerJson(request);
    if (typeof body.coachId !== "string" || !body.coachId.trim()) {
      throw new ApiError(400, "coachId es obligatorio", "campo_invalido");
    }

    const coachExistente = await db.usuario.findUnique({
      where: { id: body.coachId },
      select: { id: true, rol: true },
    });
    if (!coachExistente || coachExistente.rol !== Rol.COACH) {
      throw new ApiError(404, "Especialista no encontrado", "no_encontrado");
    }

    const esquemaHonorario = validarEsquemaHonorario(body.esquemaHonorario);
    const valorHonorario = parsearValorHonorario(esquemaHonorario, body.valorHonorario);

    const actualizado = await db.usuario.update({
      where: { id: body.coachId },
      data: {
        esquemaHonorario,
        valorHonorario,
        ...(typeof body.activo === "boolean" ? { activo: body.activo } : {}),
      },
      select: {
        id: true,
        nombre: true,
        esquemaHonorario: true,
        valorHonorario: true,
        activo: true,
      },
    });

    return jsonOk({
      mensaje: "Acuerdo de honorarios actualizado correctamente",
      coach: {
        ...actualizado,
        valorHonorario:
          actualizado.valorHonorario !== null ? Number(actualizado.valorHonorario) : null,
      },
    });
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
    verificarOrigen(request);
    await requireRole(Rol.ADMINISTRADOR, Rol.SECRETARIA);

    const body = await leerJson(request);
    if (typeof body.clienteId !== "string" || !body.clienteId.trim()) {
      throw new ApiError(400, "clienteId es requerido", "campo_invalido");
    }

    const { clienteId, coachId } = body;

    // Verificar que el cliente exista
    const clienteExistente = await db.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true },
    });
    if (!clienteExistente) {
      throw new ApiError(404, "Cliente no encontrado", "no_encontrado");
    }

    // Si viene coachId, verificar que el usuario exista, esté activo y sea COACH
    if (coachId) {
      if (typeof coachId !== "string") {
        throw new ApiError(400, "coachId debe ser un string válido", "campo_invalido");
      }
      const coach = await db.usuario.findUnique({
        where: { id: coachId },
        select: { id: true, rol: true, activo: true },
      });
      if (!coach || coach.rol !== Rol.COACH || !coach.activo) {
        throw new ApiError(400, "El usuario asignado debe ser un coach activo", "coach_invalido");
      }
    }

    const clienteActualizado = await db.cliente.update({
      where: { id: clienteId },
      data: { coachId: (coachId as string) || null },
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
