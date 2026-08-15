"use client";

// Entrega 2: el hilo son filas de `mensajes` en la base, leídas y escritas por
// `/api/cliente/mensajes`. Se cayó la respuesta automática del asesor que
// simulaba el mock: escribir mensajes falsos de un asesor real en la base sería
// dato inventado, no una simulación de UI. Sigue sin haber tiempo real (sin
// websockets): el hilo se refresca al entrar y al enviar.
import { useEffect, useRef, useState, FormEvent } from "react";
import { Send } from "lucide-react";
import BackHeader from "@/components/BackHeader";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import {
  enviarMensaje,
  horaLabel,
  obtenerMensajes,
  type MensajeCliente,
} from "@/lib/cliente-api";
import { ASESOR_MOCK } from "@/lib/mock-data";
import { errorToast } from "@/lib/alerts";

export default function MensajesPage() {
  const [mensajes, setMensajes] = useState<MensajeCliente[]>([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    async function cargar() {
      try {
        setMensajes(await obtenerMensajes());
        setError(false);
      } catch {
        setError(true);
      } finally {
        setCargando(false);
      }
    }
    void cargar();
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const contenido = texto.trim();
    if (!contenido || enviando) return;

    setEnviando(true);
    try {
      const mensaje = await enviarMensaje(contenido);
      setMensajes((prev) => [...prev, mensaje]);
      setTexto("");
    } catch (err) {
      errorToast(err instanceof Error ? err.message : "No se pudo enviar el mensaje");
    } finally {
      setEnviando(false);
    }
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
          {cargando && (
            <li className="py-10 text-center text-sm text-gray-500">
              Cargando conversación...
            </li>
          )}
          {!cargando && error && (
            <li className="py-10 text-center text-sm text-gray-500">
              No se pudo cargar la conversación. Intenta de nuevo más tarde.
            </li>
          )}
          {!cargando && !error && mensajes.length === 0 && (
            <li className="py-10 text-center text-sm text-gray-500">
              Todavía no hay mensajes. Escribe el primero.
            </li>
          )}
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
                    {horaLabel(m.hora)}
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
            className="min-h-[44px] flex-1 rounded-full border border-gray-300 px-4 text-base text-gray-900 placeholder:text-gray-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-avanza-green/40 focus:border-avanza-green"
          />
          <button
            type="submit"
            disabled={!texto.trim() || enviando}
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
