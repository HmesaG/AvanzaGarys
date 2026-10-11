import type { NextRequest } from "next/server";
import { abrirSesion, hashearPassword, type UsuarioSesion } from "@/lib/auth";
import {
  ApiError,
  ipDeRequest,
  jsonError,
  jsonOk,
  leerJson,
  manejarError,
  verificarOrigen,
} from "@/lib/http";
import { limitarTasa } from "@/lib/rate-limit";
import { db } from "@/lib/prisma";
import { emailValido, lineaValida, passwordValida, textoOpcional, textoRequerido } from "@/lib/validacion";
import { LineaAsesoria, Rol } from "@/generated/prisma/client";

const VENTANA_SEGUNDOS = 60 * 60;
/** Altas por IP y por hora: frena el registro masivo automatizado. */
const LIMITE_REGISTROS = 5;

export async function POST(request: NextRequest) {
  try {
    verificarOrigen(request);

    const ip = ipDeRequest(request);
    const limite = await limitarTasa(`registro:ip:${ip}`, LIMITE_REGISTROS, VENTANA_SEGUNDOS);
    if (!limite.permitido) {
      const respuesta = jsonError(
        429,
        "Demasiados registros desde esta conexión. Probá más tarde.",
        "rate_limit",
      );
      respuesta.headers.set("Retry-After", String(limite.resetEnSegundos));
      return respuesta;
    }

    const cuerpo = await leerJson(request);
    const nombre = textoRequerido(cuerpo.nombreCompleto ?? cuerpo.nombre, "nombre", { min: 3, max: 120 });
    const email = emailValido(cuerpo.correo ?? cuerpo.email);
    const password = passwordValida(cuerpo.password);
    const telefono = textoOpcional(cuerpo.telefono, "telefono", { max: 40 });
    const linea = lineaValida(cuerpo.tipoAsesoria ?? cuerpo.linea);
    // empresaId sólo tiene sentido en la línea Corporativo; en cualquier otra
    // línea se ignora en silencio en vez de rechazar el registro por un campo
    // de más (el frontend sólo lo manda cuando corresponde).
    const empresaIdCrudo = textoOpcional(cuerpo.empresaId, "empresaId", { max: 64 });
    const empresaId = linea === LineaAsesoria.CORPORATIVO ? empresaIdCrudo : null;

    // El rol NUNCA sale del payload: el registro público sólo crea CLIENTE.
    // Aceptar `cuerpo.rol` sería escalada de privilegios directa.
    const passwordHash = await hashearPassword(password);

    const creado = await db.$transaction(async (tx) => {
      const existente = await tx.usuario.findUnique({ where: { email }, select: { id: true } });
      if (existente) {
        throw new ApiError(409, "Ya existe una cuenta con ese correo", "email_en_uso");
      }

      if (empresaId) {
        const empresa = await tx.empresa.findUnique({ where: { id: empresaId }, select: { id: true } });
        if (!empresa) {
          throw new ApiError(400, "La empresa seleccionada no existe", "campo_invalido");
        }
      }

      const usuario = await tx.usuario.create({
        data: { email, passwordHash, nombre, rol: Rol.CLIENTE },
        select: { id: true, email: true, nombre: true, rol: true },
      });

      // coachId queda null: el coach se asigna cuando alguien aprueba la
      // evaluación del cliente (ver ADR 007, deadlock de cartera del coach).
      const cliente = await tx.cliente.create({
        data: { usuarioId: usuario.id, telefono, linea, empresaId },
        select: { id: true },
      });

      return { usuario, clienteId: cliente.id };
    });

    const usuarioSesion: UsuarioSesion = {
      id: creado.usuario.id,
      email: creado.usuario.email,
      nombre: creado.usuario.nombre,
      rol: creado.usuario.rol,
      clienteId: creado.clienteId,
    };

    // Sesión inmediata: el flujo del producto manda al usuario a /evaluacion
    // apenas se registra, sin pasar por el login.
    await abrirSesion(usuarioSesion);

    return jsonOk({ usuario: usuarioSesion }, 201);
  } catch (error) {
    // Carrera entre el findUnique y el create (dos altas simultáneas con el
    // mismo correo): la restricción única de la base es la que decide.
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { code?: string }).code === "P2002"
    ) {
      return jsonError(409, "Ya existe una cuenta con ese correo", "email_en_uso");
    }
    return manejarError(error);
  }
}
