// Edge Function: bold-webhook  (desplegar con --no-verify-jwt: la llama Bold)
//
// Bold avisa aquí cada venta (SALE_APPROVED / SALE_REJECTED / VOID_*).
// Se registra en el panel de Bold → Integraciones → Webhooks con la URL
//   https://<proyecto>.supabase.co/functions/v1/bold-webhook
//
// Seguridad: el header x-bold-signature debe ser
//   hex(HMAC-SHA256(BOLD_SECRET_KEY, base64(cuerpo crudo)))
// (en el modo de pruebas de Bold la llave es vacía). Si no coincide, 401.
//
// data.metadata.reference trae el order-id que puso bold-pago; con él se
// activa el plan (activar_pago_bold, idempotente porque Bold reintenta).
// Hay que responder 200 en menos de 2 segundos.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOLD_SECRET_KEY = Deno.env.get("BOLD_SECRET_KEY") ?? "";
// "1" solo mientras se prueba con el modo de pruebas de Bold (firma con llave vacía).
const BOLD_MODO_PRUEBAS = Deno.env.get("BOLD_MODO_PRUEBAS") === "1";

async function hmacHex(llave: string, texto: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(llave),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const firma = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(texto));
  return [...new Uint8Array(firma)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function igualesSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

interface EventoBold {
  type?: string;
  data?: {
    payment_id?: string;
    payment_method?: string;
    amount?: { total?: number };
    metadata?: { reference?: string | null };
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405 });

  if (!BOLD_SECRET_KEY && !BOLD_MODO_PRUEBAS) return new Response("Sin configurar", { status: 503 });
  const crudo = await req.text();
  const recibida = (req.headers.get("x-bold-signature") ?? "").toLowerCase();
  const esperada = await hmacHex(BOLD_MODO_PRUEBAS ? "" : BOLD_SECRET_KEY, encodeBase64(new TextEncoder().encode(crudo)));
  if (!igualesSeguro(recibida, esperada)) return new Response("Firma inválida", { status: 401 });

  let ev: EventoBold;
  try {
    ev = JSON.parse(crudo);
  } catch {
    return new Response("Cuerpo inválido", { status: 400 });
  }

  const orderId = ev.data?.metadata?.reference ?? "";
  // Ventas que no salen del botón de RumeApp (datáfono, otros links): se ignoran.
  if (!orderId.startsWith("RUME-")) return new Response("ok", { status: 200 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (ev.type === "SALE_APPROVED") {
    const { error } = await admin.rpc("activar_pago_bold", {
      p_order_id: orderId,
      p_payment_id: ev.data?.payment_id ?? null,
      p_total: Math.round(Number(ev.data?.amount?.total)),
      p_metodo: ev.data?.payment_method ?? null,
    });
    // 500 hace que Bold reintente más tarde (15 min, 1 h, 4 h…).
    if (error) return new Response(error.message, { status: 500 });
  } else if (ev.type === "SALE_REJECTED") {
    await admin.from("pagos_bold")
      .update({ estado: "rechazado", bold_payment_id: ev.data?.payment_id ?? null })
      .eq("order_id", orderId)
      .eq("estado", "pendiente");
  }
  return new Response("ok", { status: 200 });
});
