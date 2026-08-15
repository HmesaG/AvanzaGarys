import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "No hay sesión activa" }, { status: 401 });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.usuarioId },
    select: { id: true, nombre: true, correo: true, rol: true, empresaId: true },
  });

  // La sesión existe en Redis pero el usuario ya no está en la base: sesión huérfana.
  if (!usuario) {
    return Response.json({ error: "Sesión inválida" }, { status: 401 });
  }

  return Response.json({ usuario });
}
