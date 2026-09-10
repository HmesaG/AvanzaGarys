import { requireRole } from "@/lib/auth";
import { jsonOk, manejarError } from "@/lib/http";
import { statsDashboard } from "@/lib/admin-queries";
import { Rol } from "@/generated/prisma/client";

export async function GET() {
  try {
    await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);
    return jsonOk({ stats: await statsDashboard() });
  } catch (error) {
    return manejarError(error);
  }
}
