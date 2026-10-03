// Edge Function: correo-bienvenida
//
// Manda el correo de bienvenida al dueño de una finca, desde soporte@rumea.app,
// con el diseño de la marca (fondo verde, 3 consejos, botón "Entrar a mi finca").
// Si la finca ya tiene datos, lo menciona ("ya registró su primer animal…").
//
// Body: { finca_id, titulo? }. `titulo` reemplaza el título por defecto
// ("¡Le damos la bienvenida a RumeApp, <nombre>!"), p. ej. para usar
// "Bienvenida"/"Bienvenido" cuando se conoce a la persona.
//
// Se despliega con --no-verify-jwt; la autenticación es el header
// x-notify-secret (el mismo NOTIFY_SECRET de notificar-admin).
//
// Secrets: NOTIFY_SECRET, RESEND_API_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NOTIFY_SECRET = Deno.env.get("NOTIFY_SECRET") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = "RumeApp <soporte@rumea.app>";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function contar(tabla: string, fincaId: string): Promise<number> {
  const { count } = await admin.from(tabla).select("id", { count: "exact", head: true }).eq("finca_id", fincaId);
  return count ?? 0;
}

function listaNatural(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return items.slice(0, -1).join(", ") + " y " + items[items.length - 1];
}

const PASO = (n: number, titulo: string, texto: string) => `
  <tr><td valign="top" style="padding:6px 12px 6px 0;"><span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:13px;background:#B8CE7A;color:#14261A;font-weight:bold;font-size:13px;">${n}</span></td>
      <td style="padding:6px 0;color:#EFE8D8;font-size:15px;line-height:1.5;"><b>${titulo}</b> ${texto}</td></tr>`;

function html(titulo: string, primerNombre: string, finca: string, hecho: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bienvenida a RumeApp</title></head>
<body style="margin:0;padding:0;background:#0E1B12;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0E1B12;">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#14261A;border-radius:24px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
      <tr><td style="padding:34px 32px 8px;">
        <img src="https://rumea.app/logo.png" width="56" height="56" alt="RumeApp" style="display:block;border:0;">
        <div style="margin-top:20px;display:inline-block;background:rgba(184,206,122,0.16);border:1px solid rgba(184,206,122,0.40);color:#B8CE7A;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:6px 12px;border-radius:999px;">RumeApp · Gestión ganadera</div>
        <h1 style="margin:18px 0 0;color:#EFE8D8;font-size:30px;line-height:1.15;text-transform:uppercase;letter-spacing:-0.5px;">${esc(titulo)}</h1>
      </td></tr>
      <tr><td style="padding:18px 20px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#22402A;border-radius:18px;">
          <tr><td style="padding:26px 24px;color:#EFE8D8;font-size:16px;line-height:1.6;">
            <p style="margin:0 0 14px;">Hola${primerNombre ? ", " + esc(primerNombre) : ""}:</p>
            <p style="margin:0 0 14px;">Su finca <b style="color:#B8CE7A;">${esc(finca)}</b> ya está lista${hecho ? ` y ya registró ${hecho}. Arrancó muy bien.` : "."}</p>
            <p style="margin:0 0 10px;">Para sacarle el mayor provecho:</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
              ${PASO(1, "Registre sus animales.", "En el plan gratis puede tener hasta 5.")}
              ${PASO(2, "Anote las vacunas y purgas con la próxima fecha.", "La app le avisa cuando toque.")}
              ${PASO(3, "Agregue a sus socios,", "si tiene, para que los gastos se repartan solos.")}
            </table>
            <p style="margin:0;color:rgba(239,232,216,0.80);font-size:14px;">Puede entrar desde el celular o el computador, y todo queda guardado en la nube.</p>
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
    <p style="max-width:560px;margin:16px auto 0;color:rgba(239,232,216,0.40);font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;text-align:center;">Recibe este correo porque creó una cuenta en RumeApp con esta dirección.</p>
  </td></tr>
</table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405 });
  if (!NOTIFY_SECRET || req.headers.get("x-notify-secret") !== NOTIFY_SECRET) {
    return new Response("No autorizado", { status: 401 });
  }
  let body: { finca_id?: string; titulo?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Body inválido", { status: 400 });
  }
  if (!body.finca_id) return new Response("Falta finca_id", { status: 400 });

  const { data: finca, error } = await admin
    .from("fincas")
    .select("id, nombre, owner_user_id")
    .eq("id", body.finca_id)
    .maybeSingle();
  if (error || !finca) return new Response("Finca no encontrada", { status: 404 });

  const { data: u } = await admin.auth.admin.getUserById(finca.owner_user_id);
  const email = u?.user?.email;
  if (!email) return new Response("El dueño no tiene correo", { status: 404 });
  const nombre = String((u.user.user_metadata as { nombre?: string })?.nombre ?? "").trim();
  const primerNombre = nombre.split(/\s+/)[0] ?? "";

  const [animales, gastos, tareas] = await Promise.all([
    contar("animales", finca.id),
    contar("gastos", finca.id),
    contar("tareas", finca.id),
  ]);
  const hechos: string[] = [];
  if (animales) hechos.push(animales === 1 ? "su primer animal" : `${animales} animales`);
  if (gastos) hechos.push(gastos === 1 ? "un gasto" : `${gastos} gastos`);
  if (tareas) hechos.push(tareas === 1 ? "una actividad" : `${tareas} actividades`);

  const titulo = body.titulo?.trim() ||
    (primerNombre ? `¡Le damos la bienvenida a RumeApp, ${primerNombre}!` : "¡Le damos la bienvenida a RumeApp!");
  const asunto = primerNombre ? `Bienvenida a RumeApp, ${primerNombre} 🐄` : "Bienvenida a RumeApp 🐄";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [email],
      reply_to: "soporte@rumea.app",
      subject: asunto,
      html: html(titulo, primerNombre, finca.nombre, listaNatural(hechos)),
    }),
  });
  const detalle = await res.text();
  if (!res.ok) {
    console.error("Resend rechazó el correo", res.status, detalle);
    return new Response(`Resend: ${detalle}`, { status: 502 });
  }
  return new Response(detalle, { status: 200, headers: { "Content-Type": "application/json" } });
});
