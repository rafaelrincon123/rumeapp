"use client";

import { useEffect, useRef } from "react";

// Tutorial de primeros pasos: el recorrido de bienvenida y la lista de pasos
// del inicio mandan a cada sección con `?nuevo=1`, y la sección abre de una
// vez su formulario de "nuevo" — el usuario nuevo no tiene que buscar el botón.

export const RECORRIDO_VISTO_KEY = "rumeapp:recorridoVisto";
export const PASOS_OCULTOS_KEY = "rumeapp:primerosPasosOcultos";
/** Se marca cuando el usuario ve la lista incompleta: solo a él se le felicita al terminar. */
export const PASOS_EMPEZADOS_KEY = "rumeapp:primerosPasosEmpezados";

/** Enlace a una sección que abre su formulario de "nuevo" al llegar. */
export function hrefNuevo(ruta: string): string {
  return `${ruta}?nuevo=1`;
}

/**
 * Si la página se abrió con `?nuevo=1`, llama a `abrir` una sola vez y limpia
 * el parámetro de la URL (para que recargar no vuelva a abrir el formulario).
 * `listo` permite esperar a que la página tenga sus datos cargados.
 */
export function useAbrirNuevo(abrir: () => void, listo = true): void {
  const hecho = useRef(false);
  const abrirRef = useRef(abrir);
  abrirRef.current = abrir;
  useEffect(() => {
    if (hecho.current || !listo || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("nuevo") !== "1") return;
    hecho.current = true;
    url.searchParams.delete("nuevo");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    abrirRef.current();
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
