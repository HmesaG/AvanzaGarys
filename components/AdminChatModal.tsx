"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { Send, X, MessageCircle, Sparkles, Loader2, CheckCheck, Paperclip } from "lucide-react";
import { pedirJson, ErrorApi } from "@/lib/api-navegador";
import { errorToast, successToast } from "@/lib/alerts";
import { iniciales } from "@/lib/admin-formato";
import MensajeBubbleContent from "@/components/MensajeBubbleContent";

export type MensajeChat = {
  id: string;
  texto: string;
  createdAt: string;
  de: {
    id: string;
    rol: string;
    nombre: string;
  };
};

export default function AdminChatModal({
  clienteId,
  clienteNombre,
  clienteLinea,
  onCerrar,
}: {
  clienteId: string;
  clienteNombre: string;
  clienteLinea?: string;
  onCerrar: () => void;
}) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [generandoIa, setGenerandoIa] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function cargarMensajes() {
    try {
      const data = await pedirJson<{ mensajes: MensajeChat[] }>(
        `/api/admin/clientes/${clienteId}/mensajes`,
      );
      setMensajes(data.mensajes || []);
    } catch (err: unknown) {
      const msg = err instanceof ErrorApi ? err.message : "Error al cargar conversación";
      errorToast(msg);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarMensajes();
  }, [clienteId]);

  // Polling cada 3 segundos
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.visibilityState !== "visible" || mensajes.length === 0) return;
      const ultimo = mensajes[mensajes.length - 1];
      try {
        const data = await pedirJson<{ mensajes: MensajeChat[] }>(
          `/api/admin/clientes/${clienteId}/mensajes?desde=${encodeURIComponent(ultimo.createdAt)}`,
        );
        if (data?.mensajes && data.mensajes.length > 0) {
          setMensajes((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const filtrar = data.mensajes.filter((n) => !ids.has(n.id));
            return filtrar.length > 0 ? [...prev, ...filtrar] : prev;
          });
        }
      } catch {
        // Silencioso en sondeo
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [clienteId, mensajes]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes]);

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
      errorToast("No se pudo obtener sugerencia del copiloto");
    } finally {
      setGenerandoIa(false);
    }
  }

  async function handleSubirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      errorToast("El archivo no debe exceder los 10MB");
      return;
    }

    setSubiendoArchivo(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/mensajes/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al subir archivo");
      }

      const data = await res.json();
      const textoAdjunto = `[Archivo adjunto] ${data.url} (${file.name})`;

      const postRes = await pedirJson<{ mensaje: MensajeChat }>(
        `/api/admin/clientes/${clienteId}/mensajes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texto: textoAdjunto }),
        },
      );

      if (postRes?.mensaje) {
        setMensajes((prev) => [...prev, postRes.mensaje]);
      }
      successToast("Archivo enviado con éxito");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al subir y enviar archivo";
      errorToast(msg);
    } finally {
      setSubiendoArchivo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const contenido = texto.trim();
    if (!contenido) return;

    setTexto("");
    setEnviando(true);
    try {
      const data = await pedirJson<{ mensaje: MensajeChat }>(
        `/api/admin/clientes/${clienteId}/mensajes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texto: contenido }),
        },
      );
      if (data?.mensaje) {
        setMensajes((prev) => [...prev, data.mensaje]);
      }
    } catch (err: unknown) {
      setTexto(contenido);
      const msg = err instanceof ErrorApi ? err.message : "No se pudo enviar el mensaje";
      errorToast(msg);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-xs">
      <div className="flex h-[92vh] w-full max-w-lg flex-col rounded-3xl border border-gray-200 bg-white shadow-2xl animate-fade-in dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-5 py-4 dark:border-gray-800 dark:bg-gray-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-avanza-green dark:bg-emerald-950/50 dark:text-emerald-400">
              {iniciales(clienteNombre)}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-gray-900 dark:text-white">
                {clienteNombre}
              </h3>
              <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Chat en vivo con coachee</span>
                {clienteLinea && <span>· Línea {clienteLinea}</span>}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar chat"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors dark:hover:bg-gray-800 dark:hover:text-gray-200 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mensajes */}
        <ul
          ref={listRef}
          aria-label="Mensajes de conversación"
          className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5"
        >
          {cargando ? (
            <li className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="h-7 w-7 animate-spin text-avanza-green" />
              <p className="mt-2 text-xs">Cargando mensajes...</p>
            </li>
          ) : mensajes.length === 0 ? (
            <li className="flex flex-col items-center justify-center py-20 text-center text-xs text-gray-400">
              <MessageCircle className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
              <p>Aún no hay mensajes intercambiados con este coachee.</p>
              <p className="mt-1">Inicia la conversación para coordinar o resolver dudas.</p>
            </li>
          ) : (
            mensajes.map((m) => {
              const esStaff = m.de.rol !== "CLIENTE";
              return (
                <li
                  key={m.id}
                  className={`flex animate-bubble-in ${esStaff ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                      esStaff
                        ? "rounded-br-sm bg-avanza-green text-white"
                        : "rounded-bl-sm bg-gray-100 text-gray-900 border border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                    }`}
                  >
                    {!esStaff && (
                      <p className="mb-1 font-bold text-gray-500 dark:text-gray-400 text-[10px]">
                        {m.de.nombre}
                      </p>
                    )}
                    <MensajeBubbleContent texto={m.texto} />
                    <div
                      className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${
                        esStaff ? "text-emerald-100" : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      <span>
                        {new Intl.DateTimeFormat("es-DO", {
                          hour: "numeric",
                          minute: "numeric",
                          hour12: true,
                        }).format(new Date(m.createdAt))}
                      </span>
                      {esStaff && <CheckCheck className="h-3 w-3" />}
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-gray-100 bg-gray-50/80 p-3 sm:p-4 dark:border-gray-800 dark:bg-gray-950/40"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSugerirIa}
              disabled={generandoIa || enviando || subiendoArchivo}
              className="inline-flex min-h-[30px] items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all disabled:opacity-60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border dark:border-emerald-800/40"
            >
              {generandoIa ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              {generandoIa ? "Generando respuesta..." : "Copiloto IA (Sugerir respuesta)"}
            </button>
            {subiendoArchivo && (
              <span className="flex items-center gap-1 text-xs text-avanza-green font-medium">
                <Loader2 className="h-3 w-3 animate-spin" />
                Subiendo archivo...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleSubirArchivo}
              disabled={subiendoArchivo || enviando}
              className="hidden"
              accept="image/*,audio/*,.pdf,.doc,.docx"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={subiendoArchivo || enviando}
              title="Adjuntar imagen, audio o documento"
              aria-label="Adjuntar archivo o nota de voz"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              type="text"
              placeholder={`Escribe un mensaje para ${clienteNombre.split(" ")[0]}...`}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={enviando || subiendoArchivo}
              className="h-11 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-xs sm:text-sm text-gray-900 focus:border-avanza-green focus:outline-none disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <button
              type="submit"
              disabled={enviando || subiendoArchivo || !texto.trim()}
              aria-label="Enviar respuesta"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-avanza-green text-white shadow-sm transition-transform hover:bg-avanza-green/90 active:scale-95 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
