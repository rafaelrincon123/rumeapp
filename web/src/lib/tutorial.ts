"use client";

import { useEffect, useRef } from "react";

// Tutorial de primeros pasos: el recorrido de bienvenida y la lista de pasos
// del inicio mandan a cada sección con `?nuevo=1`, y la sección abre de una
// vez su formulario de "nuevo" — el usuario nuevo no tiene que buscar el botón.

export const RECORRIDO_VISTO_KEY = "rumeapp:recorridoVisto";
export const PASOS_OCULTOS_KEY = "rumeapp:primerosPasosOcultos";
/** Se marca cuando el usuario ve la lista incompleta: solo a él se le felicita al terminar. */
export const PASOS_EMPEZADOS_KEY = "rumeapp:primerosPasosEmpezados";

/**
 * Enlace a una sección que abre su formulario de "nuevo" al llegar. `extra`
 * lleva datos para prellenarlo (p. ej. `{ animal: id }` en /sanidad).
 */
export function hrefNuevo(ruta: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ nuevo: "1", ...extra });
  return `${ruta}?${params.toString()}`;
}

// Parámetros que hrefNuevo puede poner y que se limpian de la URL al abrir.
const PARAMS_NUEVO = ["nuevo", "animal", "modo"];

/**
 * Si la página se abrió con `?nuevo=1`, llama a `abrir` una sola vez (con los
 * parámetros de la URL, para prellenar) y los limpia de la URL (para que
 * recargar no vuelva a abrir el formulario). `listo` permite esperar a que la
 * página tenga sus datos cargados.
 */
export function useAbrirNuevo(abrir: (params: URLSearchParams) => void, listo = true): void {
  const hecho = useRef(false);
  const abrirRef = useRef(abrir);
  abrirRef.current = abrir;
  useEffect(() => {
    if (hecho.current || !listo || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("nuevo") !== "1") return;
    hecho.current = true;
    const params = new URLSearchParams(url.searchParams);
    for (const p of PARAMS_NUEVO) url.searchParams.delete(p);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    abrirRef.current(params);
  }, [listo]);
}

export function leerBandera(clave: string): boolean {
  try {
    return window.localStorage.getItem(clave) === "1";
  } catch {
    return false;
  }
}

export function marcarBandera(clave: string): void {
  try {
    window.localStorage.setItem(clave, "1");
  } catch {
    /* ignore */
  }
}
