import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server/auth";
import { csrfErrorResponse } from "@/lib/server/csrf";
import {
  clienteErrorResponse,
  clienteIdDeSesion,
  listarMensajes,
} from "@/lib/server/cliente-queries";
import { RemitenteMensaje, Rol } from "../../../../generated/enums";

export const runtime = "nodejs";

const mensajeSchema = z.object({
  texto: z.string().trim().min(1).max(2000),
});

export async function GET() {
  try {
    const session = await requireRole(Rol.CLIENTE);
    const clienteId = await clienteIdDeSesion(session);
    return Response.json({ mensajes: await listarMensajes(clienteId) });
  } catch (error) {
    return clienteErrorResponse(error);
  }
}

/**
 * El cliente envía un mensaje. El remitente se fija en CLIENTE desde el
 * servidor: aceptarlo del body dejaría que un cliente escriba mensajes
 * atribuidos a su asesor dentro de su propio hilo.
 */
export async function POST(request: Request) {
  try {
    const csrfError = csrfErrorResponse(request);
    if (csrfError) return csrfError;

    const session = await requireRole(Rol.CLIENTE);
    const clienteId = await clienteIdDeSesion(session);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
    }

    const parsed = mensajeSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });
    }

    const mensaje = await prisma.mensaje.create({
      data: {
        clienteId,
        de: RemitenteMensaje.CLIENTE,
        texto: parsed.data.texto,
        hora: new Date(),
      },
    });

    return Response.json(
      {
        mensaje: {
          id: mensaje.id,
          de: "cliente" as const,
          texto: mensaje.texto,
          hora: mensaje.hora.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return clienteErrorResponse(error);
  }
}
