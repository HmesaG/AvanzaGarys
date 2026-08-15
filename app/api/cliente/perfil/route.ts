import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server/auth";
import { csrfErrorResponse } from "@/lib/server/csrf";
import { consumirRateLimit, respuestaRateLimit } from "@/lib/server/rate-limit";
import {
  ClienteError,
  clienteErrorResponse,
  obtenerPerfil,
} from "@/lib/server/cliente-queries";
import { Rol } from "../../../../generated/enums";

export const runtime = "nodejs";

// Cambiar el correo obliga a responder si el nuevo ya está tomado (409), y eso
// es un oráculo de enumeración de cuentas: un cliente registrado podría probar
// correos de a uno y mapear quién tiene cuenta en la plataforma. El mensaje no
// se puede volver genérico sin dejar al usuario sin saber por qué falló, así que
// se acota el volumen. El límite va por usuario en sesión (no por IP, que es
// falsificable) y es holgado para el uso real: nadie edita su perfil 10 veces
// cada 15 minutos.
const MAX_PATCH_POR_USUARIO = 10;
const VENTANA_SEGUNDOS = 15 * 60;

/** `true` si el error de Prisma es una violación de índice único. */
function esCorreoDuplicado(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

// Solo lo que el perfil deja editar hoy. `nombreCompleto`, `edad` y
// `tipoAsesoria` no se aceptan: cambian la cartera del coach y el programa
// asignado, así que son decisión del área administrativa, no del cliente.
const perfilSchema = z
  .object({
    telefono: z
      .string()
      .trim()
      .regex(/^[0-9+()\-\s]{7,20}$/)
      .optional(),
    correo: z.string().trim().email().max(160).optional(),
  })
  .refine((datos) => datos.telefono !== undefined || datos.correo !== undefined, {
    message: "Nada que actualizar",
  });

export async function GET() {
  try {
    const session = await requireRole(Rol.CLIENTE);
    return Response.json({ perfil: await obtenerPerfil(session) });
  } catch (error) {
    return clienteErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const csrfError = csrfErrorResponse(request);
    if (csrfError) return csrfError;

    const session = await requireRole(Rol.CLIENTE);

    const limite = await consumirRateLimit(
      `perfil:patch:${session.usuarioId}`,
      MAX_PATCH_POR_USUARIO,
      VENTANA_SEGUNDOS,
    );
    if (!limite.permitido) return respuestaRateLimit(limite.reintentarEn);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
    }

    const parsed = perfilSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Revisa los datos del formulario" }, { status: 400 });
    }

    const { telefono } = parsed.data;
    const correo = parsed.data.correo?.toLowerCase();

    // El id del cliente sale de la sesión, nunca del body: sin esto cualquiera
    // podría editar el perfil ajeno pasando otro id.
    const cliente = await prisma.cliente.findUnique({
      where: { usuarioId: session.usuarioId },
      select: { id: true },
    });
    if (!cliente) {
      throw new ClienteError(404, "No hay un perfil de cliente asociado a esta cuenta");
    }

    if (correo) {
      const ocupado = await prisma.usuario.findUnique({
        where: { correo },
        select: { id: true },
      });
      if (ocupado && ocupado.id !== session.usuarioId) {
        throw new ClienteError(409, "Ese correo no está disponible");
      }
    }

    // El chequeo de disponibilidad de arriba es informativo: entre esa lectura y
    // este update otra alta puede haber tomado el correo. El índice único de
    // `Usuario.correo` es la garantía real, así que su violación se traduce al
    // mismo 409 en vez de escapar como 500 sin manejar.
    try {
      await prisma.$transaction(async (tx) => {
        if (telefono !== undefined) {
          await tx.cliente.update({ where: { id: cliente.id }, data: { telefono } });
        }
        if (correo !== undefined) {
          await tx.usuario.update({ where: { id: session.usuarioId }, data: { correo } });
        }
      });
    } catch (error) {
      if (esCorreoDuplicado(error)) {
        throw new ClienteError(409, "Ese correo no está disponible");
      }
      throw error;
    }

    return Response.json({ perfil: await obtenerPerfil(session) });
  } catch (error) {
    return clienteErrorResponse(error);
  }
}
