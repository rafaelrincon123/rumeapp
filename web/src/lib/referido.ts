// Captura, lectura y limpieza del código de referido.
//
// Flujo: alguien abre un link rumea.app/?r=ABC123 → guardarCodigoReferido()
// lo guarda en localStorage con una fecha de expiración. Al crear su primera
// finca, crearFinca() lee el código con leerCodigoReferido() y lo manda al
// servidor; el servidor lo resuelve a user_id y guarda referido_por en
// user_profiles. Después del uso, limpiarCodigoReferido() borra la clave.

const KEY = "rumeapp:codigoReferido";
const EXPIRA_DIAS = 60;

interface GuardadoLocal {
  codigo: string;
  expira: string;
}

/** Lee ?r=... del URL actual y lo guarda en localStorage por 60 días. */
export function capturarCodigoDesdeUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const codigo = (url.searchParams.get("r") ?? "").trim().toUpperCase();
    if (!codigo || !/^[A-Z2-9]{4,8}$/.test(codigo)) return;
    const expira = new Date(Date.now() + EXPIRA_DIAS * 24 * 60 * 60 * 1000).toISOString();
    const dato: GuardadoLocal = { codigo, expira };
    window.localStorage.setItem(KEY, JSON.stringify(dato));
  } catch {
    /* localStorage desactivado o URL inválida: ignorar */
  }
}

/** Devuelve el código guardado si sigue vigente; null si no hay o expiró. */
export function leerCodigoReferido(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const dato = JSON.parse(raw) as GuardadoLocal;
    if (!dato.codigo || !dato.expira) return null;
    if (new Date(dato.expira) < new Date()) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return dato.codigo;
  } catch {
    return null;
  }
}

/** Borra el código de localStorage (después de usarlo en crearFinca). */
export function limpiarCodigoReferido(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
