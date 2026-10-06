// Edge Function: bold-pago
//
// Pagos en línea con el botón de pagos de Bold (tarjeta, PSE, Nequi…).
// Corre con la service_role y la llave secreta de Bold: ninguna de las dos
// llega al navegador.
//
// Body (JSON), con el token del usuario en Authorization:
//   { accion: "crear", finca_id, plan: "ganadero"|"hacienda", periodo: "mensual"|"anual" }
//     → registra el intento en pagos_bold y devuelve los datos del botón,
//       con la firma de integridad SHA256(orderId + monto + "COP" + secreta).
//   { accion: "verificar", order_id }
//     → consulta el pago en la API de Bold (al volver de la pasarela). Si está
//       aprobado activa el plan (activar_pago_bold, igual que el webhook).
//
// Secretos: BOLD_SECRET_KEY (obligatorio). BOLD_IDENTITY_KEY es pública
// (va en el botón); si no está como secreto se usa la de abajo.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { avisarPagoAprobado } from "../_shared/pago-aprobado.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOLD_SECRET_KEY = Deno.env.get("BOLD_SECRET_KEY") ?? "";
const BOLD_IDENTITY_KEY = Deno.env.get("BOLD_IDENTITY_KEY") ?? "ZhmkoTffRHvCm8HBlBvGim1r5CjK35Jf3XiEkI-0rIQ";

// Espejo de PLAN_LIMITS / DESCUENTO_ANUAL en web/src/lib/plans.ts. El monto
// se calcula AQUÍ, nunca se recibe del navegador.
const PRECIO_MES: Record<string, number> = { ganadero: 25_000, hacienda: 55_000 };
const DESCUENTO_ANUAL = 0.25;
// Descuento de bienvenida: 20 % en los primeros 3 pagos MENSUALES aprobados
// de cada finca (espejo de DESCUENTO_INICIAL / MESES_DESCUENTO_INICIAL).
const DESCUENTO_INICIAL = 0.2;
const MESES_DESCUENTO_INICIAL = 3;
const NOMBRE_PLAN: Record<string, string> = { ganadero: "Ganadero", hacienda: "Hacienda" };

function monto(plan: string, periodo: string, descuentoInicial: boolean): number {
  const mes = PRECIO_MES[plan];
  if (periodo === "anual") return Math.round(mes * 12 * (1 - DESCUENTO_ANUAL));
  return descuentoInicial ? Math.round(mes * (1 - DESCUENTO_INICIAL)) : mes;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function sha256Hex(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let body: { accion?: string; finca_id?: string; plan?: string; periodo?: string; order_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body inválido" }, 400);
  }

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Falta el token de autenticación" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: u, error: uErr } = await admin.auth.getUser(jwt);
  if (uErr || !u.user) return json({ error: "Token inválido o expirado" }, 401);
  const userId = u.user.id;

  // ---------------------------------------------------------------- crear
  if (body.accion === "crear") {
    const { finca_id, plan, periodo } = body;
    if (!finca_id || !plan || !PRECIO_MES[plan] || (periodo !== "mensual" && periodo !== "anual")) {
      return json({ error: "Datos del pago incompletos" }, 400);
    }
    if (!BOLD_SECRET_KEY) return json({ error: "Los pagos en línea aún no están configurados" }, 503);

    const { data: finca } = await admin
      .from("fincas")
      .select("id, nombre, owner_user_id")
      .eq("id", finca_id)
      .maybeSingle();
    if (!finca || finca.owner_user_id !== userId) {
      return json({ error: "Solo el dueño de la finca puede pagar el plan" }, 403);
    }

    let descuentoInicial = false;
    if (periodo === "mensual") {
      const { count } = await admin
        .from("pagos_bold")
        .select("order_id", { count: "exact", head: true })
        .eq("finca_id", finca_id)
        .eq("estado", "aprobado")
        .eq("periodo", "mensual");
      descuentoInicial = (count ?? 0) < MESES_DESCUENTO_INICIAL;
    }
    const total = monto(plan, periodo, descuentoInicial);
    // order-id de Bold: alfanumérico, _ y -, máximo 60 caracteres.
    const orderId = `RUME-${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    const { error: insErr } = await admin.from("pagos_bold").insert({
      order_id: orderId,
      finca_id,
      user_id: userId,
      plan,
      periodo,
      monto: total,
    });
    if (insErr) return json({ error: `No se pudo registrar el pago: ${insErr.message}` }, 500);

    const firma = await sha256Hex(`${orderId}${total}COP${BOLD_SECRET_KEY}`);
    return json({
      apiKey: BOLD_IDENTITY_KEY,
      orderId,
      amount: total,
      currency: "COP",
      integritySignature: firma,
      description: `RumeApp plan ${NOMBRE_PLAN[plan]} ${periodo === "anual" ? "anual" : "mensual"}${descuentoInicial ? " (20% de bienvenida)" : ""}`.slice(0, 100),
      email: u.user.email ?? null,
    });
  }

  // ------------------------------------------------------------ verificar
  if (body.accion === "verificar") {
    const orderId = body.order_id ?? "";
    const { data: pago } = await admin.from("pagos_bold").select("*").eq("order_id", orderId).maybeSingle();
    if (!pago || pago.user_id !== userId) return json({ error: "Pago no encontrado" }, 404);
    if (pago.estado === "aprobado" || pago.estado === "revisar") {
      // Por si el correo del regalo no salió antes (no se duplica).
      if (pago.estado === "aprobado") EdgeRuntime.waitUntil(avisarPagoAprobado(admin, orderId));
      return json({ estado: pago.estado, plan: pago.plan, periodo: pago.periodo });
    }

    const r = await fetch(`https://payments.api.bold.co/v2/payment-voucher/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `x-api-key ${BOLD_IDENTITY_KEY}` },
    });
    if (!r.ok) return json({ estado: "pendiente", plan: pago.plan, periodo: pago.periodo });
    const tx = await r.json() as { payment_status?: string; transaction_id?: string; total?: number; payment_method?: string };
    const st = tx.payment_status ?? "";

    if (st === "APPROVED") {
      const { data: act, error: actErr } = await admin.rpc("activar_pago_bold", {
        p_order_id: orderId,
        p_payment_id: tx.transaction_id ?? null,
        p_total: Math.round(Number(tx.total)),
        p_metodo: tx.payment_method ?? null,
      });
      if (actErr) return json({ error: actErr.message }, 500);
      EdgeRuntime.waitUntil(avisarPagoAprobado(admin, orderId));
      return json({ estado: (act as { estado: string }).estado, plan: pago.plan, periodo: pago.periodo });
    }
    if (st === "REJECTED" || st === "FAILED" || st === "VOIDED") {
      await admin.from("pagos_bold").update({ estado: "rechazado", bold_payment_id: tx.transaction_id ?? null })
        .eq("order_id", orderId).eq("estado", "pendiente");
      return json({ estado: "rechazado", plan: pago.plan, periodo: pago.periodo });
    }
    // PROCESSING, PENDING (PSE) o NO_TRANSACTION_FOUND: todavía no hay resultado.
    return json({ estado: "pendiente", plan: pago.plan, periodo: pago.periodo });
  }

  return json({ error: "Acción desconocida" }, 400);
});
