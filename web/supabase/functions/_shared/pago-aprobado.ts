// Correos al aprobarse un pago de Bold (lo usan bold-webhook y bold-pago):
//   - al cliente: confirmación del plan + la guía de regalo en PDF adjunta
//     (Storage, bucket privado "regalos").
//   - a Rafael (ADMIN_EMAIL): aviso con finca, plan, valor y medio de pago.
//
// No se mandan dos veces: antes de enviar se "reclama" el pago marcando
// pagos_bold.regalo_enviado_at solo si estaba en null. Si el correo al
// cliente falla, se libera la marca para que el próximo aviso lo reintente.
//
// Secrets: RESEND_API_KEY, ADMIN_EMAIL.

// deno-lint-ignore-file no-explicit-any
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "";
const FROM = "RumeApp <soporte@rumea.app>";

export const GUIA_BUCKET = "regalos";
export const GUIA_ARCHIVO = "Guia-practica-ganaderia-RumeApp.pdf";
export const GUIA_NOMBRE = "Ganadería rentable: guía práctica para la finca colombiana";

const NOMBRE_PLAN: Record<string, string> = { ganadero: "Ganadero", hacienda: "Hacienda" };

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cop(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CO");
}

function fecha(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" });
}

function htmlCliente(o: { primerNombre: string; finca: string; plan: string; hasta: string; conGuia: boolean }): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Su plan está activo</title></head>
<body style="margin:0;padding:0;background:#0E1B12;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0E1B12;">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#14261A;border-radius:24px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
      <tr><td style="padding:34px 32px 8px;">
        <img src="https://rumea.app/logo.png" width="56" height="56" alt="RumeApp" style="display:block;border:0;">
        <div style="margin-top:20px;display:inline-block;background:rgba(184,206,122,0.16);border:1px solid rgba(184,206,122,0.40);color:#B8CE7A;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:6px 12px;border-radius:999px;">Pago aprobado</div>
        <h1 style="margin:18px 0 0;color:#EFE8D8;font-size:28px;line-height:1.15;">¡Su plan ${esc(o.plan)} ya está activo!</h1>
      </td></tr>
      <tr><td style="padding:18px 20px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#22402A;border-radius:18px;">
          <tr><td style="padding:26px 24px;color:#EFE8D8;font-size:16px;line-height:1.6;">
            <p style="margin:0 0 14px;">Hola${o.primerNombre ? ", " + esc(o.primerNombre) : ""}:</p>
            <p style="margin:0 0 14px;">Gracias por confiar en RumeApp. Su finca <b style="color:#B8CE7A;">${esc(o.finca)}</b> quedó en el plan <b>${esc(o.plan)}</b>${o.hasta ? ` hasta el <b>${esc(o.hasta)}</b>` : ""}.</p>
            ${o.conGuia
              ? `<p style="margin:0 0 14px;">🎁 <b>Su regalo va adjunto en este correo:</b> la guía <i>${esc(GUIA_NOMBRE)}</i>, con lo práctico de pastos, nutrición, reproducción, terneros, sanidad, leche, ceba y los números de la finca, y cómo llevar cada cosa en RumeApp.</p>`
              : `<p style="margin:0 0 14px;">🎁 Su regalo, la guía <i>${esc(GUIA_NOMBRE)}</i>, se la enviamos en un correo aparte en las próximas horas.</p>`}
            <p style="margin:0;color:rgba(239,232,216,0.80);font-size:14px;">Si tiene cualquier duda, responda este correo y con gusto le ayudamos.</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:22px 32px 8px;">
        <a href="https://rumea.app/" style="display:inline-block;background:#B8CE7A;color:#14261A;font-weight:bold;font-size:16px;text-decoration:none;padding:15px 34px;border-radius:999px;text-transform:uppercase;letter-spacing:1px;">Entrar a mi finca →</a>
      </td></tr>
      <tr><td style="padding:22px 32px 32px;color:rgba(239,232,216,0.65);font-size:14px;line-height:1.5;">
        El equipo de RumeApp<br><a href="https://rumea.app/" style="color:#B8CE7A;text-decoration:none;">rumea.app</a>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

async function enviar(payload: Record<string, unknown>): Promise<{ ok: boolean; detalle: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, reply_to: "soporte@rumea.app", ...payload }),
  });
  return { ok: res.ok, detalle: await res.text() };
}

/** Envía los correos de un pago aprobado, una sola vez. Nunca lanza error. */
export async function avisarPagoAprobado(admin: any, orderId: string): Promise<void> {
  try {
    const { data: reclamado } = await admin
      .from("pagos_bold")
      .update({ regalo_enviado_at: new Date().toISOString() })
      .eq("order_id", orderId)
      .eq("estado", "aprobado")
      .is("regalo_enviado_at", null)
      .select("*")
      .maybeSingle();
    if (!reclamado) return; // ya se envió, o el pago no está aprobado

    const { data: finca } = await admin
      .from("fincas")
      .select("id, nombre, owner_user_id, plan_pagado_hasta")
      .eq("id", reclamado.finca_id)
      .maybeSingle();
    const { data: u } = await admin.auth.admin.getUserById(reclamado.user_id);
    const email: string | undefined = u?.user?.email;
    const nombre = String(u?.user?.user_metadata?.nombre ?? "").trim();
    const whatsapp = String(u?.user?.user_metadata?.whatsapp ?? "").trim();
    const plan = NOMBRE_PLAN[reclamado.plan] ?? reclamado.plan;
    const hasta = fecha(finca?.plan_pagado_hasta ?? null);

    // La guía adjunta (si no está en Storage, el correo sale igual y se avisa a Rafael).
    let adjunto: { filename: string; content: string } | null = null;
    const { data: archivo } = await admin.storage.from(GUIA_BUCKET).download(GUIA_ARCHIVO);
    if (archivo) {
      adjunto = { filename: GUIA_ARCHIVO, content: encodeBase64(new Uint8Array(await archivo.arrayBuffer())) };
    }

    let clienteOk = false;
    let detalleCliente = "sin correo del cliente";
    if (email) {
      const r = await enviar({
        to: [email],
        subject: `Su plan ${plan} está activo 🎁 Aquí está su guía de regalo`,
        html: htmlCliente({
          primerNombre: nombre.split(/\s+/)[0] ?? "",
          finca: finca?.nombre ?? "",
          plan,
          hasta,
          conGuia: !!adjunto,
        }),
        ...(adjunto ? { attachments: [adjunto] } : {}),
      });
      clienteOk = r.ok;
      detalleCliente = r.detalle;
    }
    if (!clienteOk) {
      console.error("No se pudo enviar el correo al cliente", orderId, detalleCliente);
      // Liberar la marca: el próximo aviso de Bold (o la verificación) lo reintenta.
      await admin.from("pagos_bold").update({ regalo_enviado_at: null }).eq("order_id", orderId);
    }

    if (ADMIN_EMAIL) {
      const filas: [string, string][] = [
        ["Finca", finca?.nombre ?? reclamado.finca_id],
        ["Cliente", `${nombre || "—"} · ${email ?? "sin correo"}${whatsapp ? " · WhatsApp " + whatsapp : ""}`],
        ["Plan", `${plan} ${reclamado.periodo}`],
        ["Valor", cop(reclamado.monto)],
        ["Medio de pago", reclamado.metodo ?? "—"],
        ["Activo hasta", hasta || "—"],
        ["Pago Bold", `${reclamado.bold_payment_id ?? "—"} (orden ${orderId})`],
        ["Guía al cliente", clienteOk ? (adjunto ? "Enviada con el PDF adjunto" : "Enviada SIN el PDF: subir la guía a Storage → regalos y mandarla a mano") : "NO se pudo enviar el correo (se reintenta en el próximo aviso de Bold)"],
      ];
      await enviar({
        to: [ADMIN_EMAIL],
        subject: `💰 Pago aprobado: ${finca?.nombre ?? "finca"} · ${plan} ${reclamado.periodo} · ${cop(reclamado.monto)}`,
        html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#14261A;">
          <h2 style="margin:0 0 12px;">Pago aprobado en Bold</h2>
          <table cellpadding="6" style="border-collapse:collapse;">${filas
            .map(([k, v]) => `<tr><td style="color:#5c6b5f;">${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`)
            .join("")}</table></div>`,
      });
    }
  } catch (e) {
    console.error("avisarPagoAprobado falló", orderId, e);
  }
}
