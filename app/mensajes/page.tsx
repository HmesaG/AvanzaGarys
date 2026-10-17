"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { Send, CheckCheck, Sparkles, Loader2 } from "lucide-react";
import BackHeader from "@/components/BackHeader";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import { listarMensajes, enviarMensaje, type MensajeCliente } from "@/lib/cliente-api";
import { errorToast } from "@/lib/alerts";

export default function MensajesPage() {
  const [mensajes, setMensajes] = useState<MensajeCliente[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [generandoIa, setGenerandoIa] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  async function handleSugerirIa() {
    setGenerandoIa(true);
    try {
      const res = await fetch("/api/cliente/mensajes/ia-copiloto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensajesRecientes: mensajes.slice(-6).map((m) => ({
            remitente: m.de.rol === "CLIENTE" ? "Cliente" : "Coach",
            texto: m.texto,
          })),
        }),
      });
      if (!res.ok) throw new Error("Error obteniendo sugerencia");
      const data = await res.json();
      if (data.sugerencia) {
        setTexto(data.sugerencia);
      }
    } catch {
      errorToast("No se pudo generar la sugerencia con IA");
    } finally {
      setGenerandoIa(false);
    }
  }

  useEffect(() => {
    listarMensajes().then(setMensajes);
  }, []);

  // Polling delta reactivo cada 3 segundos cuando la pestaña está activa
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.visibilityState !== "visible" || mensajes.length === 0) return;
      const ultimo = mensajes[mensajes.length - 1];
      try {
        const nuevos = await listarMensajes(ultimo.createdAt);
        if (nuevos && nuevos.length > 0) {
          setMensajes((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const filtrar = nuevos.filter((n) => !ids.has(n.id));
            return filtrar.length > 0 ? [...prev, ...filtrar] : prev;
          });
        }
      } catch {
        // Ignorar fallos de red en sondeo de fondo
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [mensajes]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const contenido = texto.trim();
    if (!contenido) return;

    setTexto("");
    setEnviando(true);
    try {
      const mensaje = await enviarMensaje(contenido);
      setMensajes((prev) => [...prev, mensaje]);
    } catch {
      setTexto(contenido);
      errorToast("No se pudo enviar el mensaje");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <PageTransition className="flex min-h-dvh flex-col" footer={<BottomNav />}>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-8 safe-top">
        <BackHeader title="Tu asesor" subtitle="Conversación con tu equipo de Avanza" />

        {/* Indicador de estado en tiempo real */}
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Chat en vivo activo</span>
          </div>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">Respuesta directa de tu coach</span>
        </div>

        <ul ref={listRef} aria-label="Conversación con tu asesor" className="flex-1 space-y-3 overflow-y-auto pb-36">
          {mensajes.length === 0 && (
            <li className="pt-12 text-center text-sm text-gray-400 dark:text-gray-500">
              Todavía no hay mensajes en esta conversación. ¡Escribe para iniciar con tu coach!
            </li>
          )}
          {mensajes.map((m) => {
            const esCliente = m.de.rol === "CLIENTE";
            return (
              <li key={m.id} className={`flex animate-bubble-in ${esCliente ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                    esCliente
                      ? "rounded-br-sm bg-avanza-green text-white"
                      : "rounded-bl-sm bg-white text-gray-900 border border-gray-200 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                  }`}
                >
                  {!esCliente && (
                    <p className="mb-0.5 text-[10px] font-bold text-avanza-green dark:text-emerald-400">
                      {m.de.nombre || "Coach"} (Coach)
                    </p>
                  )}
                  <p className="leading-relaxed">{m.texto}</p>
                  <div
                    className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                      esCliente ? "text-emerald-100" : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    <span>
                      {new Intl.DateTimeFormat("es-DO", { hour: "numeric", minute: "numeric", hour12: true }).format(
                        new Date(m.createdAt),
                      )}
                    </span>
                    {esCliente && <CheckCheck className="h-3 w-3" />}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Barra de entrada */}
        <form
          onSubmit={handleSubmit}
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+64px)] left-0 right-0 z-20 border-t border-gray-200 bg-white/95 px-5 py-2.5 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/95"
        >
          <div className="mx-auto max-w-md">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSugerirIa}
                disabled={generandoIa || enviando}
                className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all disabled:opacity-60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border dark:border-emerald-800/40"
              >
                {generandoIa ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                {generandoIa ? "Consultando Copiloto IA..." : "Sugerir con Copiloto IA"}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Escribe tu mensaje..."
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                disabled={enviando}
                className="h-11 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 focus:border-avanza-green focus:outline-none disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={enviando || !texto.trim()}
                aria-label="Enviar mensaje"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-avanza-green text-white shadow-sm transition-transform hover:bg-avanza-green/90 active:scale-95 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </PageTransition>
  );
}
