// Edge Function: recordatorios — correo diario "Hoy toca".
//
// POST (pg_cron, 6:00 a. m.): recorre las fincas, arma lo atrasado (últimos
//   7 días), lo de hoy y lo de mañana —actividades, sanidad programada,
//   próximas fechas de sanidad y partos previstos, igual que /tareas— y se lo
//   manda a cada miembro que puede editar (owner, admin, operario), salvo que
//   se haya dado de baja. Si una finca no tiene nada, no se manda nada.
//   Body opcional para probar: { finca_id, solo_email, fecha } → solo esa
//   finca, solo a ese correo, con "hoy" = fecha, sin registrar el envío.
// GET ?u=<user_id>&t=<token>: enlace "dejar de recibir" del correo.
//
// --no-verify-jwt; auth del POST por header x-notify-secret.
// Secrets: NOTIFY_SECRET, RESEND_API_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NOTIFY_SECRET = Deno.env.get("NOTIFY_SECRET") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = "RumeApp <soporte@rumea.app>";
const URL_FUNCION = `${SUPABASE_URL}/functions/v1/recordatorios`;
const DIAS_ATRASO = 7;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Grupo = "atrasado" | "hoy" | "manana";
interface Item {
  grupo: Grupo;
  fecha: string;
  texto: string;
}

const TIPO_SANIDAD: Record<string, string> = {
  vacuna: "Vacuna",
  tratamiento: "Tratamiento",
  desparasitacion: "Purga",
  revision: "Revisión",
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria de la finca. */
function hoyEn(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz || "America/Bogota" }).format(new Date());
}

function sumarDias(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function fechaCorta(iso: string): string {
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${meses[m - 1]}`;
}

function grupoDe(fecha: string, hoy: string): Grupo | null {
  const f = fecha.slice(0, 10);
  if (f === hoy) return "hoy";
  if (f === sumarDias(hoy, 1)) return "manana";
  if (f < hoy && f >= sumarDias(hoy, -DIAS_ATRASO)) return "atrasado";
  return null;
}

async function token(userId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(NOTIFY_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("baja:" + userId));
  return Array.from(new Uint8Array(sig)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Lo que toca en una finca, agrupado. */
async function itemsDeFinca(fincaId: string, hoy: string): Promise<Item[]> {
  const desde = sumarDias(hoy, -DIAS_ATRASO);
  const hasta = sumarDias(hoy, 1);
  const [animalesR, tareasR, sanidadR, proxR, serviciosR] = await Promise.all([
    admin.from("animales").select("id, nombre, nro_identificacion").eq("finca_id", fincaId),
    admin.from("tareas").select("titulo, fecha, completada").eq("finca_id", fincaId)
      .eq("completada", false).gte("fecha", desde).lte("fecha", hasta),
    admin.from("sanidad").select("animal_id, tipo, producto, fecha, completada").eq("finca_id", fincaId)
      .or("completada.is.null,completada.eq.false").gte("fecha", desde).lte("fecha", hasta),
    admin.from("sanidad").select("animal_id, tipo, producto, proximo_evento_fecha").eq("finca_id", fincaId)
      .gte("proximo_evento_fecha", desde).lte("proximo_evento_fecha", hasta),
    admin.from("servicios").select("hembra_id, resultado, fecha_probable_parto, completada").eq("finca_id", fincaId)
      .in("resultado", ["prenada", "pendiente"]).gte("fecha_probable_parto", desde)
      .lte("fecha_probable_parto", hasta),
  ]);
  const animal = new Map<string, string>();
  for (const a of animalesR.data ?? []) {
    animal.set(a.id, a.nombre?.trim() ? `${a.nombre} (#${a.nro_identificacion})` : `#${a.nro_identificacion}`);
  }
  const nombreAnimal = (id: string | null) => (id ? animal.get(id) ?? "un animal" : "un animal");

  const items: Item[] = [];
  const vistos = new Set<string>();
  const agregar = (fecha: string, texto: string) => {
    const g = grupoDe(fecha, hoy);
    if (!g) return;
    const clave = fecha.slice(0, 10) + "|" + texto;
    if (vistos.has(clave)) return;
    vistos.add(clave);
    items.push({ grupo: g, fecha: fecha.slice(0, 10), texto });
  };

  for (const t of tareasR.data ?? []) agregar(t.fecha, t.titulo);
  for (const s of sanidadR.data ?? []) {
    agregar(s.fecha, `${TIPO_SANIDAD[s.tipo] ?? "Sanidad"}: ${s.producto} — ${nombreAnimal(s.animal_id)}`);
  }
  for (const s of proxR.data ?? []) {
    agregar(s.proximo_evento_fecha, `Próxima ${(TIPO_SANIDAD[s.tipo] ?? "sanidad").toLowerCase()}: ${s.producto} — ${nombreAnimal(s.animal_id)}`);
  }
  for (const s of serviciosR.data ?? []) {
    if (s.completada) continue;
    agregar(s.fecha_probable_parto, `Parto previsto — ${nombreAnimal(s.hembra_id)}`);
  }
  const orden: Record<Grupo, number> = { atrasado: 0, hoy: 1, manana: 2 };
  items.sort((a, b) => orden[a.grupo] - orden[b.grupo] || a.fecha.localeCompare(b.fecha));
  return items;
}

const GRUPOS: { g: Grupo; titulo: string; color: string }[] = [
  { g: "atrasado", titulo: "Atrasado", color: "#F19277" },
  { g: "hoy", titulo: "Hoy", color: "#B8CE7A" },
  { g: "manana", titulo: "Mañana", color: "#7EBFA9" },
];

function html(finca: string, primerNombre: string, items: Item[], urlBaja: string): string {
  const bloques = GRUPOS.map(({ g, titulo, color }) => {
    const lista = items.filter((i) => i.grupo === g);
    if (!lista.length) return "";
    const filas = lista.map((i) => `
      <tr><td style="padding:7px 0;border-top:1px solid rgba(239,232,216,0.10);color:#EFE8D8;font-size:15px;line-height:1.45;">
        ${esc(i.texto)}${g === "atrasado" ? ` <span style="color:rgba(239,232,216,0.55);font-size:13px;">· era el ${fechaCorta(i.fecha)}</span>` : ""}
      </td></tr>`).join("");
    return `
      <tr><td style="padding:16px 24px 4px;">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${color};font-weight:bold;">● ${titulo} (${lista.length})</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">${filas}</table>
      </td></tr>`;
  }).join("");

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hoy toca</title></head>
<body style="margin:0;padding:0;background:#0E1B12;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0E1B12;">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#14261A;border-radius:24px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
      <tr><td style="padding:30px 32px 6px;">
        <img src="https://rumea.app/logo.png" width="48" height="48" alt="RumeApp" style="display:block;border:0;">
        <div style="margin-top:16px;color:#B8CE7A;font-size:12px;letter-spacing:2px;text-transform:uppercase;">${esc(finca)}</div>
        <h1 style="margin:8px 0 0;color:#EFE8D8;font-size:28px;line-height:1.15;text-transform:uppercase;">${primerNombre ? `Buenos días, ${esc(primerNombre)}.` : "Buenos días."}<br><span style="color:#B8CE7A;">Esto es lo que toca.</span></h1>
      </td></tr>
      <tr><td style="padding:14px 20px 4px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#22402A;border-radius:18px;padding-bottom:14px;">${bloques}</table>
      </td></tr>
      <tr><td align="center" style="padding:22px 32px 6px;">
        <a href="https://rumea.app/tareas" style="display:inline-block;background:#B8CE7A;color:#14261A;font-weight:bold;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:999px;text-transform:uppercase;letter-spacing:1px;">Abrir mi finca →</a>
      </td></tr>
      <tr><td style="padding:18px 32px 28px;color:rgba(239,232,216,0.60);font-size:13px;line-height:1.5;text-align:center;">
        Cuando lo haga, márquelo como hecho en RumeApp y deja de salir aquí.
      </td></tr>
    </table>
    <p style="max-width:560px;margin:16px auto 0;color:rgba(239,232,216,0.45);font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;text-align:center;">
      Le llega este correo porque es parte del equipo de ${esc(finca)} en RumeApp.<br>
      <a href="${urlBaja}" style="color:rgba(239,232,216,0.65);">Dejar de recibir estos recordatorios</a>
    </p>
  </td></tr>
</table></body></html>`;
}

function asunto(finca: string, items: Item[]): string {
  const atrasados = items.filter((i) => i.grupo === "atrasado").length;
  const hoy = items.filter((i) => i.grupo === "hoy").length;
  if (hoy) return `Hoy en ${finca}: ${hoy} ${hoy === 1 ? "cosa por hacer" : "cosas por hacer"}${atrasados ? ` y ${atrasados} atrasada${atrasados === 1 ? "" : "s"}` : ""}`;
  if (atrasados) return `${finca}: ${atrasados} ${atrasados === 1 ? "pendiente atrasado" : "pendientes atrasados"}`;
  return `Mañana en ${finca}: ${items.length} ${items.length === 1 ? "cosa por hacer" : "cosas por hacer"}`;
}

async function enviar(to: string, subject: string, cuerpo: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: "soporte@rumea.app", subject, html: cuerpo }),
  });
  if (!res.ok) console.error("Resend", res.status, await res.text());
  // Resend (plan gratis) admite ~2 envíos por segundo.
  await new Promise((r) => setTimeout(r, 600));
  return res.ok;
}

function pagina(titulo: string, texto: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title></head>
<body style="margin:0;background:#14261A;font-family:Arial,Helvetica,sans-serif;color:#EFE8D8;display:flex;min-height:100vh;align-items:center;justify-content:center;">
<div style="max-width:420px;padding:32px;text-align:center;"><img src="https://rumea.app/logo.png" width="56" height="56" alt="RumeApp">
<h1 style="font-size:22px;margin:18px 0 10px;">${titulo}</h1><p style="color:rgba(239,232,216,0.8);line-height:1.6;">${texto}</p>
<a href="https://rumea.app/" style="display:inline-block;margin-top:16px;background:#B8CE7A;color:#14261A;font-weight:bold;text-decoration:none;padding:12px 26px;border-radius:999px;">Ir a RumeApp</a></div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function darDeBaja(url: URL): Promise<Response> {
  const u = url.searchParams.get("u") ?? "";
  const t = url.searchParams.get("t") ?? "";
  if (!u || !t || t !== (await token(u))) {
    return pagina("Enlace no válido", "Este enlace no es válido. Puede apagar los recordatorios desde Mi cuenta en RumeApp.", 400);
  }
  const { error } = await admin.from("user_profiles").upsert(
    { user_id: u, recordatorios_correo: false, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) return pagina("No pudimos hacerlo", "Intente de nuevo más tarde o apáguelos desde Mi cuenta en RumeApp.", 500);
  return pagina("Listo", "Ya no le enviaremos los recordatorios diarios. Puede volver a activarlos cuando quiera desde Mi cuenta en RumeApp.");
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET") return darDeBaja(url);
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405 });
  if (!NOTIFY_SECRET || req.headers.get("x-notify-secret") !== NOTIFY_SECRET) {
    return new Response("No autorizado", { status: 401 });
  }
  let body: { finca_id?: string; solo_email?: string; fecha?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* body vacío = corrida diaria */
  }
  const prueba = !!body.solo_email;

  let q = admin.from("fincas").select("id, nombre, timezone");
  if (body.finca_id) q = q.eq("id", body.finca_id);
  const { data: fincas, error } = await q;
  if (error) return new Response(error.message, { status: 500 });

  const resumen = { fincas: 0, con_pendientes: 0, enviados: 0, omitidos: 0 };
  for (const f of fincas ?? []) {
    resumen.fincas++;
    const hoy = body.fecha ?? hoyEn(f.timezone);
    const items = await itemsDeFinca(f.id, hoy);
    if (!items.length) continue;
    resumen.con_pendientes++;

    if (prueba) {
      const ok = await enviar(body.solo_email!, "[Prueba] " + asunto(f.nombre, items),
        html(f.nombre, "", items, `${URL_FUNCION}?u=prueba&t=prueba`));
      if (ok) resumen.enviados++;
      continue;
    }

    const { data: miembros } = await admin.from("finca_miembros").select("user_id, rol")
      .eq("finca_id", f.id).eq("activo", true).in("rol", ["owner", "admin", "operario"]);
    for (const m of miembros ?? []) {
      const { data: perfil } = await admin.from("user_profiles").select("recordatorios_correo, nombre")
        .eq("user_id", m.user_id).maybeSingle();
      if (perfil && perfil.recordatorios_correo === false) { resumen.omitidos++; continue; }
      // Registrar ANTES de enviar: si el cron se repite, el segundo choca con la llave.
      const { error: dup } = await admin.from("recordatorios_enviados")
        .insert({ fecha: hoy, user_id: m.user_id, finca_id: f.id });
      if (dup) { resumen.omitidos++; continue; }
      const { data: u } = await admin.auth.admin.getUserById(m.user_id);
      const email = u?.user?.email;
      if (!email) continue;
      const nombre = String(perfil?.nombre || (u.user.user_metadata as { nombre?: string })?.nombre || "").trim();
      const baja = `${URL_FUNCION}?u=${m.user_id}&t=${await token(m.user_id)}`;
      if (await enviar(email, asunto(f.nombre, items), html(f.nombre, nombre.split(/\s+/)[0] ?? "", items, baja))) {
        resumen.enviados++;
      }
    }
  }
  return new Response(JSON.stringify(resumen), { status: 200, headers: { "Content-Type": "application/json" } });
});
