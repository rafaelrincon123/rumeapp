"use client";

import { track } from "@vercel/analytics";

// Píxel de Meta (Facebook / Instagram): conjunto de datos "RumeApp Web" del
// portafolio RumeApp. El ID no es secreto (Meta lo muestra en el código de
// cualquier web que lo use). NEXT_PUBLIC_META_PIXEL_ID lo reemplaza si
// existe; con la variable vacía ("") el píxel queda apagado.
//
// Eventos que usa RumeApp (los estándar de Meta, para optimizar anuncios):
//   PageView             cada cambio de página
//   Lead                 abre el registro
//   CompleteRegistration crea su cuenta
//   StartTrial           crea su finca probando un plan pago
//   InitiateCheckout     envía una solicitud de pago
// Nunca se mandan datos personales (correo, teléfono, nombre).
//
// Cada evento también se manda a Vercel Analytics (pestaña "Events") para
// ver el embudo visita → abre registro → crea cuenta → crea finca → pide pago
// sin depender de Meta.

export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "1403461817861345";

type Fbq = (cmd: "track" | "trackCustom", evento: string, params?: Record<string, unknown>) => void;

export function trackPixel(evento: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    const props: Record<string, string | number | boolean | null> = {};
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v === null || ["string", "number", "boolean"].includes(typeof v)) {
        props[k] = v as string | number | boolean | null;
      }
    }
    if (evento !== "PageView") track(evento, props);
  } catch {
    /* analytics nunca debe romper la app */
  }
  if (!PIXEL_ID) return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (typeof fbq === "function") fbq("track", evento, params);
}
