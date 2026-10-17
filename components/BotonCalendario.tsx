"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarPlus, Download, ExternalLink, Calendar } from "lucide-react";
import {
  generarEnlaceGoogleCalendar,
  generarEnlaceOutlook,
} from "@/lib/calendario-sync";

interface BotonCalendarioProps {
  cita: {
    id: string;
    fecha: string;
    modalidad: string;
    clienteNombre?: string;
    coachNombre?: string;
  };
  className?: string;
}

export default function BotonCalendario({ cita, className = "" }: BotonCalendarioProps) {
  const [abierto, setAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fechaInicio = new Date(cita.fecha);
  const enlaceVirtual =
    cita.modalidad === "Virtual"
      ? `https://meet.jit.si/Avanza-Coaching-${cita.id}`
      : "Oficinas AvanzA Coaching";

  const evento = {
    id: cita.id,
    titulo: `Sesión Coaching AvanzA${cita.clienteNombre ? ` - ${cita.clienteNombre}` : ""}`,
    descripcion: `Sesión de coaching AvanzA (${cita.modalidad}). Sala: ${enlaceVirtual}`,
    ubicacion: enlaceVirtual,
    fechaInicio,
    duracionMinutos: 60,
  };

  const enlaceGoogle = generarEnlaceGoogleCalendar(evento);
  const enlaceOutlook = generarEnlaceOutlook(evento);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-label="Agregar a mi calendario"
        className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 active:scale-95 transition-all dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <CalendarPlus className="h-3.5 w-3.5 text-avanza-green dark:text-emerald-400" />
        <span>+ Calendario</span>
      </button>

      {abierto && (
        <div className="absolute left-0 mt-1.5 w-52 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-30 animate-fade-in dark:border-gray-700 dark:bg-gray-800">
          <a
            href={enlaceGoogle}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setAbierto(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5 text-blue-500" />
            <span className="flex-1">Google Calendar</span>
            <ExternalLink className="h-3 w-3 text-gray-400" />
          </a>

          <a
            href={enlaceOutlook}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setAbierto(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5 text-sky-600" />
            <span className="flex-1">Outlook / Office</span>
            <ExternalLink className="h-3 w-3 text-gray-400" />
          </a>

          <a
            href={`/api/citas/${cita.id}/ics`}
            download
            onClick={() => setAbierto(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors border-t border-gray-100 dark:border-gray-700 mt-1"
          >
            <Download className="h-3.5 w-3.5 text-avanza-green dark:text-emerald-400" />
            <span className="flex-1">Descargar archivo .ics</span>
          </a>
        </div>
      )}
    </div>
  );
}
