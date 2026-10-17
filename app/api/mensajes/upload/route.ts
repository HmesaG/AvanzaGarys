import { NextRequest } from "next/server";
import { requireSesion } from "@/lib/auth";
import { jsonOk, manejarError, ApiError, verificarOrigen } from "@/lib/http";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
];

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    verificarOrigen(request);
    await requireSesion();

    const formData = await request.formData();
    const archivo = formData.get("file") as File | null;

    if (!archivo) {
      throw new ApiError(400, "No se adjuntó ningún archivo", "campo_invalido");
    }

    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      throw new ApiError(
        400,
        "Tipo de archivo no permitido. Solo imágenes, PDFs o audios.",
        "tipo_no_permitido",
      );
    }

    if (archivo.size > MAX_SIZE_BYTES) {
      throw new ApiError(
        400,
        "El archivo supera el límite de 10MB",
        "archivo_demasiado_grande",
      );
    }

    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const extension = archivo.name.split(".").pop() || "dat";
    const nombreUnico = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const rutaArchivo = join(uploadsDir, nombreUnico);

    const buffer = Buffer.from(await archivo.arrayBuffer());
    await writeFile(rutaArchivo, buffer);

    const urlPublica = `/uploads/${nombreUnico}`;

    return jsonOk(
      {
        url: urlPublica,
        nombreOriginal: archivo.name,
        tipo: archivo.type,
        tamanio: archivo.size,
      },
      201,
    );
  } catch (error) {
    return manejarError(error);
  }
}
