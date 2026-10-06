// Edge Function: notificar-admin
//
// La llaman triggers de la base de datos (pg_net) para avisarle por correo
// al admin de RumeApp cuando:
//   - nueva_finca     → alguien se registró y creó una finca (cualquier plan)
//   - solicitud_pago  → un cliente pidió cambiar a un plan pago
//   - error           → la app le falló a un usuario (tabla errores_app)
//
// Body: { tipo, id }. Solo se manda el id; los datos se leen aquí con la
// service_role key, así nada sensible viaja por pg_net.
//
// Se despliega con --no-verify-jwt (quien llama es la base de datos, no un
// usuario): la autenticación es el header x-notify-secret.
//
// Secrets: NOTIFY_SECRET, RESEND_API_KEY, ADMIN_EMAIL (opcional).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NOTIFY_SECRET = Deno.env.get("NOTIFY_SECRET") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "rafael.rincong@gmail.com";
const FROM = "RumeApp <notificaciones@rumea.app>";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Espejo de PLAN_LIMITS.precioCOP y DESCUENTO_ANUAL en web/src/lib/plans.ts.
const PRECIO_MES_COP: Record<string, number> = { ganadero: 25_000, hacienda: 55_000 };
const DESCUENTO_ANUAL = 0.2;
const DESCUENTO_INICIAL = 0.2;

function valorEsperado(plan: string, periodo: string): string {
  const mes = PRECIO_MES_COP[plan];
  if (!mes) return "—";
  if (periodo === "anual") {
    return `$${Math.round(mes * 12 * (1 - DESCUENTO_ANUAL)).toLocaleString("es-CO")} COP por el año`;
  }
  // Descuento de bienvenida (plans.ts): 20 % en los primeros 3 pagos mensuales.
  const conDescuento = Math.round(mes * (1 - DESCUENTO_INICIAL));
  return `$${mes.toLocaleString("es-CO")} COP por el mes ($${conDescuento.toLocaleString("es-CO")} si es de sus primeros 3 meses, con el 20 % de bienvenida)`;
}

const PLAN_NOMBRE: Record<string, string> = {
  ranchero: "Ranchero (gratis)",
  ganadero: "Ganadero",
  hacienda: "Hacienda",
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function whatsapp(tel: string | null): string {
  if (!tel) return "—";
  const digitos = tel.replace(/\D/g, "");
  const conPais = digitos.length === 10 ? `57${digitos}` : digitos;
  return `<a href="https://wa.me/${conPais}" style="color:#B8CE7A">${esc(tel)}</a>`;
}

// Mismo lenguaje visual que las plantillas de correo de Supabase Auth.
function plantilla(titulo: string, filas: [string, string][], extra = ""): string {
  const tabla = filas
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#B8CE7A;font-size:12px;text-transform:uppercase;letter-spacing:.08em;vertical-align:top;white-space:nowrap">${esc(k)}</td>` +
        `<td style="padding:6px 0;color:#EFE8D8;font-size:14px">${v}</td></tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#14261A;padding:28px 0;font-family:Arial,Helvetica,sans-serif">
<tr><td align="center"><table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
<tr><td style="padding:0 20px 14px;color:#B8CE7A;font-size:11px;letter-spacing:.2em;font-weight:bold">RUMEAPP · AVISO INTERNO</td></tr>
<tr><td style="padding:0 20px 18px;color:#EFE8D8;font-size:22px;font-weight:bold;text-transform:uppercase">${esc(titulo)}</td></tr>
<tr><td style="padding:0 20px"><div style="background:#22402A;border-radius:14px;padding:18px 20px">
<table role="presentation" cellpadding="0" cellspacing="0">${tabla}</table>${extra}</div></td></tr>
</table></td></tr></table>`;
}

async function perfilYEmail(userId: string | null) {
  if (!userId) return { email: null, perfil: null };
  const [{ data: u }, { data: perfil }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  return { email: u?.user?.email ?? null, perfil };
}

async function correoNuevaFinca(id: string) {
  const { data: f } = await admin.from("fincas").select("*").eq("id", id).maybeSingle();
  if (!f) return null;
  const { email, perfil } = await perfilYEmail(f.owner_user_id);
  const { count } = await admin
    .from("fincas")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", f.owner_user_id);
  const ubicacion = [perfil?.ciudad, perfil?.departamento].filter(Boolean).join(", ") || "—";
  const plan = PLAN_NOMBRE[f.plan] ?? f.plan;
  return {
    subject: `🐄 Nueva finca: ${f.nombre} · ${plan}${f.trial_ends_at ? " (prueba)" : ""}`,
    html: plantilla("Nueva finca registrada", [
      ["Finca", esc(f.nombre)],
      ["Plan", `${esc(plan)}${f.trial_ends_at ? ` · prueba hasta ${esc(fecha(f.trial_ends_at))}` : ""}`],
      ["Dueño", esc(perfil?.nombre ?? "—")],
      ["Correo", email ? `<a href="mailto:${esc(email)}" style="color:#B8CE7A">${esc(email)}</a>` : "—"],
      ["WhatsApp", whatsapp(perfil?.telefono ?? null)],
      ["Ubicación", esc(ubicacion)],
      ["Animales aprox.", esc(f.tamano_aprox ?? "—")],
      ["Cómo nos conoció", esc(perfil?.referido_via ?? "—")],
      ["Fincas de este dueño", esc(count ?? 1)],
      ["Fecha", esc(fecha(f.created_at))],
    ]),
  };
}

async function correoSolicitudPago(id: string) {
  const { data: s } = await admin.from("comprobantes_pago").select("*").eq("id", id).maybeSingle();
  if (!s) return null;
  const { data: f } = await admin.from("fincas").select("*").eq("id", s.finca_id).maybeSingle();
  const { email, perfil } = await perfilYEmail(s.subido_por);
  let comprobante = "No subió comprobante";
  if (s.storage_path) {
    const { data: firmado } = await admin.storage
      .from("comprobantes-pago")
      .createSignedUrl(s.storage_path, 60 * 60 * 24 * 30);
    comprobante = firmado
      ? `<a href="${esc(firmado.signedUrl)}" style="color:#B8CE7A;font-weight:bold">Ver comprobante</a> (link válido 30 días)`
      : "Subido, pero no se pudo generar el link";
  }
  const plan = PLAN_NOMBRE[s.plan_solicitado] ?? s.plan_solicitado;
  const sql = `update fincas set plan = '${s.plan_solicitado}', plan_pagado = true where id = '${s.finca_id}';`;
  return {
    subject: `💰 Solicitud de pago: ${f?.nombre ?? "finca"} → ${plan}`,
    html: plantilla(
      "Solicitud de cambio de plan",
      [
        ["Finca", esc(f?.nombre ?? s.finca_id)],
        ["Plan pedido", esc(`${plan} · pago ${s.periodo ?? "mensual"}`)],
        ["Debe llegar", esc(valorEsperado(s.plan_solicitado, s.periodo ?? "mensual"))],
        ["Plan hoy", esc(f ? `${PLAN_NOMBRE[f.plan] ?? f.plan}${f.plan_pagado ? " (pagado)" : ""}` : "—")],
        ["Quién", esc(perfil?.nombre ?? "—")],
        ["Correo", email ? `<a href="mailto:${esc(email)}" style="color:#B8CE7A">${esc(email)}</a>` : "—"],
        ["WhatsApp", whatsapp(perfil?.telefono ?? null)],
        ["Comprobante", comprobante],
        ["Fecha", esc(fecha(s.created_at))],
      ],
      `<div style="margin-top:16px;color:#EFE8D8;font-size:13px">Cuando confirmes el pago, actívalo en Supabase → SQL Editor:</div>
<div style="margin-top:8px;background:#14261A;border-radius:8px;padding:10px 12px;font-family:monospace;font-size:12px;color:#B8CE7A">${esc(sql)}</div>
<div style="margin-top:16px;color:#EFE8D8;font-size:13px">🎓 Y envíale el <strong>Curso intensivo de ganadería digital</strong> a ${email ? esc(email) : "su correo"}: es el regalo del plan pago.</div>`
    ),
  };
}

async function correoError(id: string) {
  const { data: e } = await admin.from("errores_app").select("*").eq("id", Number(id)).maybeSingle();
  if (!e) return null;
  const { email } = await perfilYEmail(e.user_id);
  return {
    subject: `⚠️ Error en RumeApp: ${String(e.mensaje).slice(0, 80)}`,
    html: plantilla(
      "Error en la app",
      [
        ["Mensaje", esc(e.mensaje)],
        ["Página", esc(e.url ?? "—")],
        ["Usuario", esc(email ?? "sin sesión")],
        ["Navegador", esc(e.user_agent ?? "—")],
        ["Fecha", esc(fecha(e.created_at))],
      ],
      e.stack
        ? `<pre style="margin-top:14px;background:#14261A;border-radius:8px;padding:10px 12px;font-size:11px;color:#EFE8D8;white-space:pre-wrap;word-break:break-all">${esc(String(e.stack).slice(0, 3000))}</pre>`
        : ""
    ),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405 });
  if (!NOTIFY_SECRET || req.headers.get("x-notify-secret") !== NOTIFY_SECRET) {
    return new Response("No autorizado", { status: 401 });
  }
  if (!RESEND_API_KEY) return new Response("Falta RESEND_API_KEY", { status: 500 });

  let body: { tipo?: string; id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Body inválido", { status: 400 });
  }
  const { tipo, id } = body;
  if (!tipo || !id) return new Response("Faltan tipo e id", { status: 400 });

  const correo =
    tipo === "nueva_finca"
      ? await correoNuevaFinca(id)
      : tipo === "solicitud_pago"
      ? await correoSolicitudPago(id)
      : tipo === "error"
      ? await correoError(id)
      : null;
  if (!correo) return new Response("Nada que notificar", { status: 200 });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [ADMIN_EMAIL], ...correo }),
  });
  if (!res.ok) {
    const detalle = await res.text();
    console.error("Resend rechazó el correo", res.status, detalle);
    return new Response(`Resend: ${detalle}`, { status: 502 });
  }
  return new Response("ok", { status: 200 });
});
