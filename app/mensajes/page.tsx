"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { Send } from "lucide-react";
import BackHeader from "@/components/BackHeader";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import { ASESOR_MOCK, MENSAJES_INICIALES, type Mensaje } from "@/lib/mock-data";

function horaActual() {
  return new Date().toLocaleTimeString("es-DO", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Respuestas simuladas — no hay tiempo real (sin websockets, decisión de arquitectura Fase 1).
const RESPUESTAS_MOCK = [
  "Recibido, gracias por contarme.",
  "Perfecto, seguimos avanzando en la próxima sesión.",
  "Anotado. ¿Necesitas algo más por ahora?",
];

export default function MensajesPage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>(MENSAJES_INICIALES);
  const [texto, setTexto] = useState("");
  const [asesorEscribiendo, setAsesorEscribiendo] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes, asesorEscribiendo]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const contenido = texto.trim();
    if (!contenido) return;

    const nuevoMensaje: Mensaje = {
      id: `local-${Date.now()}`,
      de: "cliente",
      texto: contenido,
      hora: horaActual(),
    };
    setMensajes((prev) => [...prev, nuevoMensaje]);
    setTexto("");

    setAsesorEscribiendo(true);
    window.setTimeout(() => {
      const respuesta =
        RESPUESTAS_MOCK[Math.floor(Math.random() * RESPUESTAS_MOCK.length)];
      setMensajes((prev) => [
        ...prev,
        {
          id: `asesor-${Date.now()}`,
          de: "asesor",
          texto: respuesta,
          hora: horaActual(),
        },
      ]);
      setAsesorEscribiendo(false);
    }, 1200);
  }

  return (
    <PageTransition
      className="flex min-h-dvh flex-col"
      footer={<BottomNav />}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-8 safe-top">
        <BackHeader
          title={ASESOR_MOCK.nombre}
          subtitle={ASESOR_MOCK.enLinea ? "En línea" : "Desconectado"}
        />

        <ul
          ref={listRef}
          aria-label="Conversación con tu asesor"
          className="flex-1 space-y-3 overflow-y-auto pb-32"
        >
          {mensajes.map((m) => {
            const esCliente = m.de === "cliente";
            return (
              <li
                key={m.id}
                className={`flex animate-bubble-in ${esCliente ? "justify-end" : "justify-start"}`}
              >
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
                    {m.hora}
                  </p>
                </div>
              </li>
            );
          })}
          {asesorEscribiendo && (
            <li className="flex justify-start" aria-live="polite">
              <div className="rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-4 py-3">
                <span className="sr-only">{ASESOR_MOCK.nombre} está escribiendo</span>
                <span className="flex gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 [animation-delay:300ms]" />
                </span>
              </div>
            </li>
          )}
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
            className="min-h-[44px] flex-1 rounded-full border border-gray-300 px-4 text-base text-gray-900 placeholder:text-gray-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-avanza-green/40 focus:border-avanza-green"
          />
          <button
            type="submit"
            disabled={!texto.trim()}
            aria-label="Enviar mensaje"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-avanza-green text-white transition-all duration-150 hover:bg-avanza-green-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </form>

    </PageTransition>
  );
}
