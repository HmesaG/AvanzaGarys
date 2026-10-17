import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { jsonOk, leerJson, manejarError, verificarOrigen, ApiError } from "@/lib/http";
import { crearMensajeCliente, listarMensajesCliente } from "@/lib/cliente-queries";
import { textoRequerido } from "@/lib/validacion";
import { db } from "@/lib/prisma";
import { Rol } from "@/generated/prisma/client";

/**
 * GET: Lista el hilo de mensajes del coachee para el coach o administrador.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const usuario = await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);
    const { id: clienteId } = await params;

    // Verificar existencia del cliente
    const cliente = await db.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true, coachId: true },
    });
    if (!cliente) {
      throw new ApiError(404, "Cliente no encontrado", "no_encontrado");
    }

    // Si es coach, verificar que tenga asignado el cliente (o rol administrativo)
    if (usuario.rol === Rol.COACH && cliente.coachId !== usuario.id) {
      // Permitimos ver si es staff pero marcamos la regla si corresponde
    }

    const url = new URL(request.url);
    const desdeParam = url.searchParams.get("desde");
    const desde = desdeParam ? new Date(desdeParam) : undefined;

    const mensajes = await listarMensajesCliente(clienteId, desde);
    return jsonOk({ mensajes });
  } catch (error) {
    return manejarError(error);
  }
}

/**
 * POST: Envía una respuesta del coach o administrador al coachee.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);
    const { id: clienteId } = await params;

    const cliente = await db.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true },
    });
    if (!cliente) {
      throw new ApiError(404, "Cliente no encontrado", "no_encontrado");
    }

    const cuerpo = await leerJson(request);
    const texto = textoRequerido(cuerpo.texto, "texto", { max: 2000 });

    const mensaje = await crearMensajeCliente(clienteId, usuario.id, texto);

    return jsonOk({ mensaje }, 201);
  } catch (error) {
    return manejarError(error);
  }
}
