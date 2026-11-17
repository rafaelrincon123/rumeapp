// Edge Function: correo-manual
//
// Envía un correo one-off desde soporte@rumea.app vía Resend. Reusable para
// correos personalizados (recordatorios de prueba por vencer, mensajes a
// usuarios específicos, etc.) que no entran en los flujos automáticos.
//
// Body:
//   {
//     to: string | string[],    // destinatario(s)
//     subject: string,
//     html: string,
//     reply_to?: string,        // por defecto: soporte@rumea.app
//     from?: string             // por defecto: RumeApp <soporte@rumea.app>
//   }
//
// Se despliega con --no-verify-jwt; auth por header x-notify-secret
// (mismo NOTIFY_SECRET de notificar-admin y correo-bienvenida).
//
// IMPORTANTE: deploy con el flag --no-verify-jwt para que Supabase no
// bloquee los requests antes de llegar a esta función. Sin él la plataforma
// responde 401 UNAUTHORIZED_NO_AUTH_HEADER y nunca ve el x-notify-secret.
// Ejemplo: supabase functions deploy correo-manual --no-verify-jwt
//
// Secrets: NOTIFY_SECRET, RESEND_API_KEY.

const NOTIFY_SECRET = Deno.env.get("NOTIFY_SECRET") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_DEFAULT = "RumeApp <soporte@rumea.app>";
const REPLY_TO_DEFAULT = "soporte@rumea.app";

type Body = {
  to?: string | string[];
  subject?: string;
  html?: string;
  reply_to?: string;
  from?: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405 });
  if (!NOTIFY_SECRET || req.headers.get("x-notify-secret") !== NOTIFY_SECRET) {
    return new Response("No autorizado", { status: 401 });
  }
  if (!RESEND_API_KEY) {
    return new Response("Falta RESEND_API_KEY", { status: 503 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response("Body inválido", { status: 400 });
  }

  const to = Array.isArray(body.to) ? body.to : body.to ? [body.to] : [];
  if (!to.length) return new Response("Falta 'to'", { status: 400 });
  if (!body.subject?.trim()) return new Response("Falta 'subject'", { status: 400 });
  if (!body.html?.trim()) return new Response("Falta 'html'", { status: 400 });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: body.from?.trim() || FROM_DEFAULT,
      to,
      reply_to: body.reply_to?.trim() || REPLY_TO_DEFAULT,
      subject: body.subject.trim(),
      html: body.html,
    }),
  });
  const detalle = await res.text();
  if (!res.ok) {
    console.error("Resend rechazó el correo", res.status, detalle);
    return new Response(`Resend: ${detalle}`, { status: 502 });
  }
  return new Response(detalle, { status: 200, headers: { "Content-Type": "application/json" } });
});
