import { requireSesion } from "@/lib/auth";
import { jsonOk, manejarError } from "@/lib/http";

export async function GET() {
  try {
    const usuario = await requireSesion();
    return jsonOk({ usuario });
  } catch (error) {
    return manejarError(error);
  }
}
