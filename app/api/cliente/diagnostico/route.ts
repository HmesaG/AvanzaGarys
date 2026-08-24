import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { csrfErrorResponse } from "@/lib/server/csrf";
import {
  clienteErrorResponse,
  clienteIdDeSesion,
  crearDiagnostico,
} from "@/lib/server/cliente-queries";
import { Rol } from "../../../../generated/enums";

export const runtime = "nodejs";

// Mismos topes que `evaluacion` y `mensajes`: sin `.max()` un cliente
// autenticado puede postear megabytes por campo (las columnas son TEXT).
// `nivelComunicacion` es una lista cerrada —la misma que ofrece la UI— y su
// columna es VARCHAR: texto libre de más de 191 caracteres reventaría en
// Prisma (P2000) como 500 en vez de un 400 limpio.
const diagnosticoSchema = z.object({
  climaLaboral: z.string().trim().min(10).max(2000),
  principalDesafio: z.string().trim().min(10).max(2000),
  nivelComunicacion: z.enum(["Buena", "Regular", "Deficiente"]),
  objetivoEmpresa: z.string().trim().min(10).max(2000),
});

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

    const parsed = diagnosticoSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Revisa los datos del formulario" }, { status: 400 });
    }

    await crearDiagnostico(clienteId, parsed.data);

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return clienteErrorResponse(error);
  }
}
