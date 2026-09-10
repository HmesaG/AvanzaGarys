// Cliente HTTP del navegador para las rutas `/api/*`.
//
// Existe para no repetir en cada pantalla el mismo bloque de "parsear el JSON,
// distinguir 401 de 403 y sacar el mensaje del cuerpo". Los route handlers
// responden siempre `{ error, codigo }` en el caso de fallo (ver `lib/http.ts`),
// así que se puede tipar el error una vez y manejarlo igual en todas partes.

export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    mensaje: string,
    readonly codigo: string = "error",
  ) {
    super(mensaje);
    this.name = "ErrorApi";
  }

  /** La sesión venció o fue invalidada: quien llama debería mandar al login. */
  get esNoAutenticado(): boolean {
    return this.status === 401;
  }
}

function mensajeDeError(cuerpo: unknown, status: number): { mensaje: string; codigo: string } {
  if (typeof cuerpo === "object" && cuerpo !== null) {
    const { error, codigo } = cuerpo as { error?: unknown; codigo?: unknown };
    return {
      mensaje: typeof error === "string" ? error : `Error ${status}`,
      codigo: typeof codigo === "string" ? codigo : "error",
    };
  }
  return { mensaje: `Error ${status}`, codigo: "error" };
}

/** Pide JSON y lanza `ErrorApi` si la respuesta no es 2xx. */
export async function pedirJson<T>(url: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(url, init);
  // Un 500 puede no traer JSON; `null` cae en el mensaje genérico.
  const cuerpo: unknown = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const { mensaje, codigo } = mensajeDeError(cuerpo, respuesta.status);
    throw new ErrorApi(respuesta.status, mensaje, codigo);
  }

  return cuerpo as T;
}
