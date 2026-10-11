"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { Send } from "lucide-react";
import BackHeader from "@/components/BackHeader";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import { listarMensajes, enviarMensaje, type MensajeCliente } from "@/lib/cliente-api";
import { errorToast } from "@/lib/alerts";

export default function MensajesPage() {
  const [mensajes, setMensajes] = useState<MensajeCliente[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    listarMensajes().then(setMensajes);
  }, []);

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

        <ul ref={listRef} aria-label="Conversación con tu asesor" className="flex-1 space-y-3 overflow-y-auto pb-32">
          {mensajes.length === 0 && (
            <li className="pt-8 text-center text-sm text-gray-400">Todavía no hay mensajes</li>
          )}
          {mensajes.map((m) => {
            const esCliente = m.de.rol === "CLIENTE";
            return (
              <li key={m.id} className={`flex animate-bubble-in ${esCliente ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    esCliente
                      ? "rounded-br-sm bg-avanza-green text-white"
                      : "rounded-bl-sm bg-white text-gray-900 border border-gray-200"
                  }`}
                >
                  <p>{m.texto}</p>
                  <p
                    className={`mt-1 text-[11px] tabular-nums ${
                      esCliente ? "text-avanza-green-light" : "text-gray-400"
                    }`}
                  >
                    {new Intl.DateTimeFormat("es-DO", { hour: "numeric", minute: "2-digit" }).format(
                      new Date(m.createdAt),
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <form
        onSubmit={handleSubmit}
        className="fixed inset-x-0 bottom-[56px] z-30 border-t border-gray-200 bg-white/95 backdrop-blur safe-bottom"
      >
        <div className="mx-auto flex max-w-md items-center gap-2 px-5 py-3">
          <label htmlFor="mensaje" className="sr-only">
            Escribe un mensaje
          </label>
          <input
            id="mensaje"
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe un mensaje..."
            autoComplete="off"
            disabled={enviando}
            className="min-h-[44px] flex-1 rounded-full border border-gray-300 px-4 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-avanza-green/40 focus:border-avanza-green"
          />
          <button
            type="submit"
            disabled={!texto.trim() || enviando}
            aria-label="Enviar mensaje"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-avanza-green text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </PageTransition>
  );
}
