import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { jsonError, jsonOk, leerJson, manejarError, verificarOrigen } from "@/lib/http";
import { limitarTasa } from "@/lib/rate-limit";
import { db } from "@/lib/prisma";
import { emailValido, textoOpcional, textoRequerido } from "@/lib/validacion";
import { Rol } from "@/generated/prisma/client";

const VENTANA_SEGUNDOS = 15 * 60;
/** Mismo criterio que /api/auth/registro: frena el oráculo de enumeración de correos. */
const LIMITE_CAMBIO_CORREO = 10;

export async function GET() {
  try {
    const usuario = await requireRole(Rol.CLIENTE);
    const perfil = await db.usuario.findUniqueOrThrow({
      where: { id: usuario.id },
      select: {
        nombre: true,
        email: true,
        cliente: { select: { telefono: true, linea: true, empresa: { select: { id: true, nombre: true } } } },
      },
    });
    return jsonOk({ perfil });
  } catch (error) {
    return manejarError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.CLIENTE);
    const cuerpo = await leerJson(request);

    const nombre = textoOpcional(cuerpo.nombreCompleto ?? cuerpo.nombre, "nombre", { max: 120 });
    const telefono = textoOpcional(cuerpo.telefono, "telefono", { max: 40 });
    const correoNuevo = cuerpo.correo ?? cuerpo.email;

    if (correoNuevo !== undefined) {
      const limite = await limitarTasa(
        `cambio-correo:usuario:${usuario.id}`,
        LIMITE_CAMBIO_CORREO,
        VENTANA_SEGUNDOS,
      );
      if (!limite.permitido) {
        const respuesta = jsonError(429, "Demasiados cambios de correo. Probá más tarde.", "rate_limit");
        respuesta.headers.set("Retry-After", String(limite.resetEnSegundos));
        return respuesta;
      }
    }

    const email = correoNuevo !== undefined ? emailValido(correoNuevo) : undefined;

    try {
      await db.$transaction([
        db.usuario.update({
          where: { id: usuario.id },
          data: {
            ...(nombre !== null ? { nombre: nombre ?? undefined } : {}),
            ...(email !== undefined ? { email } : {}),
          },
        }),
        ...(telefono !== null
          ? [
              db.cliente.update({
                where: { usuarioId: usuario.id },
                data: { telefono: telefono ?? undefined },
              }),
            ]
          : []),
      ]);
    } catch (error) {
      if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
        return jsonError(409, "Ya existe una cuenta con ese correo", "email_en_uso");
      }
      throw error;
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return manejarError(error);
  }
}
