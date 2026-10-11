import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, jsonOk, leerJson, manejarError, verificarOrigen } from "@/lib/http";
import { crearDiagnostico } from "@/lib/cliente-queries";
import { textoRequerido } from "@/lib/validacion";
import { NivelComunicacion, Rol } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.CLIENTE);
    const cuerpo = await leerJson(request);

    const climaLaboral = textoRequerido(cuerpo.climaLaboral, "climaLaboral", { min: 5, max: 255 });
    const principalDesafio = textoRequerido(cuerpo.principalDesafio, "principalDesafio", {
      min: 5,
      max: 255,
    });
    const objetivoEmpresa = textoRequerido(cuerpo.objetivoEmpresa, "objetivoEmpresa", {
      min: 5,
      max: 255,
    });

    const nivelTexto = textoRequerido(cuerpo.nivelComunicacion, "nivelComunicacion", { max: 32 }).toUpperCase();
    if (!(nivelTexto in NivelComunicacion)) {
      throw new ApiError(400, "Nivel de comunicación inválido (Buena, Regular o Deficiente)", "campo_invalido");
    }
    const nivelComunicacion = NivelComunicacion[nivelTexto as keyof typeof NivelComunicacion];

    const diagnostico = await crearDiagnostico(usuario.clienteId!, {
      climaLaboral,
      principalDesafio,
      nivelComunicacion,
      objetivoEmpresa,
    });

    return jsonOk({ diagnostico }, 201);
  } catch (error) {
    return manejarError(error);
  }
}
