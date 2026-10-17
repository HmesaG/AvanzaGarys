"use client";

import { useState } from "react";
import { BarChart3, PieChart, TrendingUp, Award } from "lucide-react";

export type MetricasGraficos = {
  ingresosMensuales: { mes: string; monto: number }[];
  distribucionLineas: { linea: string; cantidad: number; porcentaje: number; color: string }[];
  tasaCumplimientoGrow: number;
};

export default function AdminAnalyticsChart({ data }: { data: MetricasGraficos }) {
  const [tab, setTab] = useState<"ingresos" | "lineas">("ingresos");
  const maxIngreso = Math.max(...data.ingresosMensuales.map((i) => i.monto), 1);

  return (
    <section aria-label="Analítica de Negocio" className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-avanza-green dark:bg-emerald-950/40 dark:text-emerald-400">
            <TrendingUp className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Analítica & Desempeño</h2>
        </div>

        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setTab("ingresos")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              tab === "ingresos"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <BarChart3 className="h-3 w-3" />
            Ingresos
          </button>
          <button
            type="button"
            onClick={() => setTab("lineas")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              tab === "lineas"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <PieChart className="h-3 w-3" />
            Líneas
          </button>
        </div>
      </div>

      {tab === "ingresos" ? (
        <div className="animate-fade-in">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Evolución últimos 6 meses</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">Monto en USD</span>
          </div>

          <div className="flex h-40 items-end gap-3 pt-6 pb-2 px-2 border-b border-gray-100 dark:border-gray-800">
            {data.ingresosMensuales.map((item) => {
              const alturaPorc = Math.max(12, Math.round((item.monto / maxIngreso) * 100));
              return (
                <div key={item.mes} className="group relative flex flex-1 flex-col items-center h-full justify-end">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-7 hidden rounded-md bg-gray-900 px-2 py-0.5 text-[10px] font-semibold text-white group-hover:block transition-all shadow-md z-10 whitespace-nowrap">
                    ${item.monto.toLocaleString()} USD
                  </div>
                  <div
                    style={{ height: `${alturaPorc}%` }}
                    className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-300 group-hover:brightness-110"
                  />
                  <span className="mt-2 text-[10px] font-semibold text-gray-500 uppercase dark:text-gray-400">{item.mes}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-gray-500 pt-1 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-avanza-green dark:text-emerald-400" />
              Efectividad GROW: <strong className="text-gray-800 dark:text-gray-200">{data.tasaCumplimientoGrow}% de metas alcanzadas</strong>
            </span>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in space-y-3 pt-1">
          <p className="text-xs text-gray-500 mb-3 dark:text-gray-400">Distribución de clientes activos por especialidad</p>
          {data.distribucionLineas.map((item) => (
            <div key={item.linea}>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-gray-700 dark:text-gray-300">{item.linea}</span>
                <span className="text-gray-900 dark:text-white">{item.cantidad} coachees ({item.porcentaje}%)</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden dark:bg-gray-800">
                <div
                  style={{ width: `${item.porcentaje}%`, backgroundColor: item.color }}
                  className="h-full rounded-full transition-all duration-500"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
