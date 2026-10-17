"use client";

import { FileText, Download } from "lucide-react";

export default function MensajeBubbleContent({ texto }: { texto: string }) {
  // Verificar si contiene URL de adjunto subido
  const matchUpload = texto.match(/\/uploads\/[^\s)]+/);

  if (matchUpload) {
    const url = matchUpload[0];
    const extension = url.split(".").pop()?.toLowerCase() || "";

    const esAudio = ["mp3", "ogg", "wav", "webm"].includes(extension);
    const esImagen = ["jpg", "jpeg", "png", "webp", "gif"].includes(extension);
    const esPdf = extension === "pdf";

    return (
      <div className="space-y-1.5">
        {texto.replace(url, "").trim() && (
          <p className="leading-relaxed">{texto.replace(url, "").trim()}</p>
        )}

        {esImagen && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1">
            <img
              src={url}
              alt="Adjunto"
              className="max-h-48 max-w-full rounded-xl object-cover shadow-2xs hover:opacity-95 transition-opacity"
            />
          </a>
        )}

        {esAudio && (
          <div className="pt-1">
            <audio controls className="h-8 w-full max-w-[220px] rounded-lg">
              <source src={url} />
              Tu navegador no soporta el reproductor de audio.
            </audio>
          </div>
        )}

        {esPdf && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex items-center gap-2 rounded-xl bg-black/10 dark:bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-black/15 transition-all mt-1"
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate flex-1">Documento PDF</span>
            <Download className="h-3.5 w-3.5 opacity-70" />
          </a>
        )}

        {!esImagen && !esAudio && !esPdf && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex items-center gap-1.5 underline text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar archivo adjunto
          </a>
        )}
      </div>
    );
  }

  return <p className="leading-relaxed">{texto}</p>;
}
