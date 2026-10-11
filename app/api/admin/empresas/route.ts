import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { jsonOk, leerJson, manejarError, verificarOrigen } from "@/lib/http";
import { crearEmpresa, listarEmpresas } from "@/lib/admin-queries";
import { textoOpcional, textoRequerido } from "@/lib/validacion";
import { Rol } from "@/generated/prisma/client";

/** Empresas: gestión reservada a Administrador/Secretaria — NO a Coach. */
export async function GET() {
  try {
    await requireRole(Rol.ADMINISTRADOR, Rol.SECRETARIA);
    return jsonOk({ empresas: await listarEmpresas() });
  } catch (error) {
    return manejarError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    verificarOrigen(request);
    await requireRole(Rol.ADMINISTRADOR, Rol.SECRETARIA);
    const cuerpo = await leerJson(request);

    const nombre = textoRequerido(cuerpo.nombre, "nombre", { min: 2, max: 120 });
    const ruc = textoOpcional(cuerpo.ruc, "ruc", { max: 40 });
    const telefono = textoOpcional(cuerpo.telefono, "telefono", { max: 40 });

    const empresa = await crearEmpresa({ nombre, ruc, telefono });
    return jsonOk({ empresa }, 201);
  } catch (error) {
    return manejarError(error);
  }
}
