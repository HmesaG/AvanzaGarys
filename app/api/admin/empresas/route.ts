import { z } from "zod";
import { authErrorResponse, requireRole } from "@/lib/server/auth";
import { csrfErrorResponse } from "@/lib/server/csrf";
import { crearEmpresa, listarEmpresas } from "@/lib/server/admin-queries";
import { Rol } from "../../../../generated/enums";

export const runtime = "nodejs";

const empresaSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  contacto: z.string().trim().min(2).max(120),
  correo: z.string().trim().email().max(160),
});

export async function GET() {
  try {
    await requireRole(Rol.ADMINISTRADOR, Rol.SECRETARIA);
    const empresas = await listarEmpresas();
    return Response.json({ empresas });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const csrfError = csrfErrorResponse(request);
    if (csrfError) return csrfError;

    await requireRole(Rol.ADMINISTRADOR, Rol.SECRETARIA);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
    }

    const parsed = empresaSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Revisa los datos del formulario" }, { status: 400 });
    }

    const empresa = await crearEmpresa(parsed.data);
    return Response.json({ empresa }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
