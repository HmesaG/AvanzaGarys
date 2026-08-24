import { requireRole } from "@/lib/server/auth";
import { csrfErrorResponse } from "@/lib/server/csrf";
import {
  alternarTarea,
  clienteErrorResponse,
  clienteIdDeSesion,
} from "@/lib/server/cliente-queries";
import { Rol } from "../../../../../generated/enums";

export const runtime = "nodejs";

/** Marca/desmarca una tarea propia de "Mi proceso" (checkbox de `/proceso`). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const csrfError = csrfErrorResponse(request);
    if (csrfError) return csrfError;

    const session = await requireRole(Rol.CLIENTE);
    const clienteId = await clienteIdDeSesion(session);
    const { id } = await params;

    const tarea = await alternarTarea(clienteId, id);
    return Response.json({ tarea });
  } catch (error) {
    return clienteErrorResponse(error);
  }
}
