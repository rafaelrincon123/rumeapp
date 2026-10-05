"use client";

import { getSupabase } from "./supabase";
import type { Periodo } from "./plans";
import type { PlanFinca } from "./types";

// Pagos en línea con el botón de pagos de Bold. La firma de integridad y el
// monto los calcula la Edge Function bold-pago (con la llave secreta); aquí
// solo se pinta el botón con esos datos y se verifica el resultado al volver.

export const BOLD_SCRIPT = "https://checkout.bold.co/library/boldPaymentButton.js";

export interface DatosBotonBold {
  apiKey: string;
  orderId: string;
  amount: number;
  currency: "COP";
  integritySignature: string;
  description: string;
  email: string | null;
}

export type EstadoPagoBold = "aprobado" | "pendiente" | "rechazado" | "revisar";

async function invocar<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke("bold-pago", { body });
  if (error) {
    // El mensaje útil viene en el cuerpo de la respuesta de la función.
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) msg = ((await ctx.json()) as { error?: string }).error ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return data as T;
}

export function crearPagoBold(fincaId: string, plan: PlanFinca, periodo: Periodo): Promise<DatosBotonBold> {
  return invocar<DatosBotonBold>({ accion: "crear", finca_id: fincaId, plan, periodo });
}

export function verificarPagoBold(
  orderId: string
): Promise<{ estado: EstadoPagoBold; plan: PlanFinca; periodo: Periodo }> {
  return invocar({ accion: "verificar", order_id: orderId });
}

/** Adonde vuelve Bold al terminar (debe ser https; en local se usa rumea.app). */
export function urlRegresoBold(): string {
  const origen = window.location.origin.startsWith("https://") ? window.location.origin : "https://rumea.app";
  return `${origen}/plan`;
}

/**
 * Pinta el botón de Bold dentro de `contenedor`: el script de Bold reemplaza
 * la etiqueta <script> (con los data-*) por su botón.
 */
export function pintarBotonBold(contenedor: HTMLElement, d: DatosBotonBold): void {
  contenedor.innerHTML = "";
  const s = document.createElement("script");
  s.src = BOLD_SCRIPT;
  s.setAttribute("data-bold-button", "dark-L");
  s.setAttribute("data-api-key", d.apiKey);
  s.setAttribute("data-order-id", d.orderId);
  s.setAttribute("data-amount", String(d.amount));
  s.setAttribute("data-currency", d.currency);
  s.setAttribute("data-integrity-signature", d.integritySignature);
  s.setAttribute("data-description", d.description);
  s.setAttribute("data-redirection-url", urlRegresoBold());
  if (d.email) s.setAttribute("data-customer-data", JSON.stringify({ email: d.email }));
  contenedor.appendChild(s);
}
