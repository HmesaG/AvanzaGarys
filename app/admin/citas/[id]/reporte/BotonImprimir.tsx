"use client";

import { Printer } from "lucide-react";

export default function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-2 rounded-xl bg-avanza-green px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-avanza-green/90 active:scale-95 transition-all"
    >
      <Printer className="h-4 w-4" />
      <span>Imprimir / Guardar como PDF</span>
    </button>
  );
}
