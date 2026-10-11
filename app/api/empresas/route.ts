import { jsonOk, manejarError } from "@/lib/http";
import { listarEmpresas } from "@/lib/admin-queries";

/**
 * Catálogo público de empresas, sin auth: lo usa el selector de `/registro`
 * antes de que exista sesión. Sin paginación ni rate limit — catálogo chico,
 * revisar si crece mucho (hallazgo BAJO documentado en Fase 5 E1).
 */
export async function GET() {
  try {
    const empresas = await listarEmpresas();
    return jsonOk({ empresas: empresas.map(({ id, nombre }) => ({ id, nombre })) });
  } catch (error) {
    return manejarError(error);
  }
}
