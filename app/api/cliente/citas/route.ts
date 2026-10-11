import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, jsonOk, leerJson, manejarError, verificarOrigen } from "@/lib/http";
import { crearCitaCliente, listarCitasCliente } from "@/lib/cliente-queries";
import { fechaValida } from "@/lib/validacion";
import { Rol } from "@/generated/prisma/client";

const MODALIDADES = ["Virtual", "Presencial"] as const;

export async function GET() {
  try {
    const usuario = await requireRole(Rol.CLIENTE);
    const citas = await listarCitasCliente(usuario.clienteId!);
    return jsonOk({ citas });
  } catch (error) {
    return manejarError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.CLIENTE);
    const cuerpo = await leerJson(request);

    const fecha = fechaValida(cuerpo.fecha, "fecha");
    const modalidad = cuerpo.modalidad === undefined ? "Virtual" : cuerpo.modalidad;
    if (!MODALIDADES.includes(modalidad as (typeof MODALIDADES)[number])) {
      throw new ApiError(400, "La modalidad debe ser Virtual o Presencial", "campo_invalido");
    }

    const cita = await crearCitaCliente(usuario.clienteId!, { fecha, modalidad: modalidad as string });
    return jsonOk({ cita }, 201);
  } catch (error) {
    return manejarError(error);
  }
}
