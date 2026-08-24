// Catálogo público de empresas — se usa desde /registro antes de haber sesión
// (línea de asesoría Corporativo). Sin auth a propósito: es solo un selector,
// no expone datos de contacto de la empresa a un visitante anónimo.

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const empresas = await prisma.empresa.findMany({
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  return Response.json({ empresas });
}
