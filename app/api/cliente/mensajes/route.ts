import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { jsonOk, leerJson, manejarError, verificarOrigen } from "@/lib/http";
import { crearMensajeCliente, listarMensajesCliente } from "@/lib/cliente-queries";
import { textoRequerido } from "@/lib/validacion";
import { Rol } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const usuario = await requireRole(Rol.CLIENTE);
    const url = new URL(request.url);
    const desdeParam = url.searchParams.get("desde");
    const desde = desdeParam ? new Date(desdeParam) : undefined;
    const mensajes = await listarMensajesCliente(usuario.clienteId!, desde);
    return jsonOk({ mensajes });
  } catch (error) {
    return manejarError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.CLIENTE);
    const cuerpo = await leerJson(request);

    const texto = textoRequerido(cuerpo.texto, "texto", { max: 2000 });
    const mensaje = await crearMensajeCliente(usuario.clienteId!, usuario.id, texto);

    return jsonOk({ mensaje }, 201);
  } catch (error) {
    return manejarError(error);
  }
}
