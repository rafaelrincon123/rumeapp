// Edge Function: seguimiento — correos automáticos para que los registros nuevos
// terminen de entrar y vuelvan.
//
// POST (pg_cron, cada hora): manda, una sola vez por persona,
//   · "falta_paso": cuentas de los últimos 14 días (con más de 2 h) que no
//     pusieron el código del correo o que entraron pero no crearon su finca.
//     El botón entra de una vez (confirma el correo y abre sesión).
//   · "dia2": dueños de fincas creadas hace 20 h a 10 días que aún no han
//     anotado ni pesajes ni leche: les muestra cómo llevar el peso y el ordeño.
//     Solo de 6 a. m. a 7 p. m. (Colombia) y respetando la baja de correos.
//   · "prueba_aviso:<finca>" (faltan 3 días o menos) y "prueba_fin:<finca>"
//     (terminó hace menos de 2 días): prueba del plan Ganadero sin pagar.
//     Mismo horario; es un aviso de la cuenta, así que no depende de la baja.
//   Body opcional para probar: { prueba: "falta_paso" | "dia2", user_id, a }
//   → manda ese correo de ese usuario al correo `a`, sin registrar el envío.
// GET ?u=<user_id>&e=<vence epoch s>&r=<ruta>&t=<firma>: botón de los correos.
//   Confirma el correo si hacía falta, genera un enlace de un solo uso y
//   redirige a rumea.app/<ruta>?acceso=<token_hash>; la app abre la sesión.
//
// --no-verify-jwt; auth del POST por header x-notify-secret.
// Secrets: NOTIFY_SECRET, RESEND_API_KEY.

import { createClient, User } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NOTIFY_SECRET = Deno.env.get("NOTIFY_SECRET") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = "RumeApp <soporte@rumea.app>";
const APP = "https://rumea.app";
const URL_FUNCION = `${SUPABASE_URL}/functions/v1/seguimiento`;
const URL_BAJA = `${SUPABASE_URL}/functions/v1/recordatorios`;
const HORA = 3600 * 1000;
const DIA = 24 * HORA;

// Rutas a las que puede llevar el botón (la firma cubre la clave, no la URL).
const RUTAS: Record<string, string> = {
  inicio: "/",
  animales: "/animales?nuevo=1&modo=varios",
  peso: "/peso?nuevo=1",
  leche: "/produccion?nuevo=1",
  plan: "/plan",
  fundador: "/plan?activar=fundador",
};

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

async function firmar(texto: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(NOTIFY_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(sig)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Botón que entra directo a la app (vence en `dias`). */
async function enlaceAcceso(userId: string, ruta: keyof typeof RUTAS, dias: number): Promise<string> {
  const e = Math.floor((Date.now() + dias * DIA) / 1000);
  const t = await firmar(`acceso:${userId}:${e}:${ruta}`);
  return `${URL_FUNCION}?u=${userId}&e=${e}&r=${ruta}&t=${t}`;
}

/** Mismo enlace de baja que el correo "Hoy toca" (firma "baja:" + user_id). */
async function enlaceBaja(userId: string): Promise<string> {
  return `${URL_BAJA}?u=${userId}&t=${await firmar("baja:" + userId)}`;
}

function primerNombre(u: User): string {
  const nombre = String((u.user_metadata as { nombre?: string })?.nombre ?? "").trim();
  return nombre.split(/\s+/)[0] ?? "";
}

// ---------------------------------------------------------------- plantillas

const BOTON = (href: string, texto: string) => `
  <a href="${href}" style="display:inline-block;background:#B8CE7A;color:#14261A;font-weight:bold;font-size:16px;text-decoration:none;padding:15px 30px;border-radius:999px;text-transform:uppercase;letter-spacing:1px;">${texto}</a>`;

const BOTON_SECUNDARIO = (href: string, texto: string) => `
  <a href="${href}" style="display:inline-block;border:1px solid #B8CE7A;color:#B8CE7A;font-weight:bold;font-size:14px;text-decoration:none;padding:11px 22px;border-radius:999px;">${texto}</a>`;

function marco(titulo: string, cuerpo: string, botones: string, pie: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RumeApp</title></head>
<body style="margin:0;padding:0;background:#0E1B12;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0E1B12;">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#14261A;border-radius:24px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
      <tr><td style="padding:34px 32px 8px;">
        <img src="https://rumea.app/logo.png" width="56" height="56" alt="RumeApp" style="display:block;border:0;">
        <div style="margin-top:20px;display:inline-block;background:rgba(184,206,122,0.16);border:1px solid rgba(184,206,122,0.40);color:#B8CE7A;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:6px 12px;border-radius:999px;">RumeApp · Gestión ganadera</div>
        <h1 style="margin:18px 0 0;color:#EFE8D8;font-size:28px;line-height:1.15;text-transform:uppercase;letter-spacing:-0.5px;">${esc(titulo)}</h1>
      </td></tr>
      <tr><td style="padding:18px 20px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#22402A;border-radius:18px;">
          <tr><td style="padding:26px 24px;color:#EFE8D8;font-size:16px;line-height:1.6;">${cuerpo}</td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:22px 32px 8px;">${botones}</td></tr>
      <tr><td style="padding:22px 32px 32px;color:rgba(239,232,216,0.65);font-size:14px;line-height:1.5;">
        El equipo de RumeApp<br><a href="https://rumea.app/" style="color:#B8CE7A;text-decoration:none;">rumea.app</a>
      </td></tr>
    </table>
    <p style="max-width:560px;margin:16px auto 0;color:rgba(239,232,216,0.40);font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;text-align:center;">${pie}</p>
  </td></tr>
</table></body></html>`;
}

async function correoFaltaPaso(u: User): Promise<{ asunto: string; html: string }> {
  const nombre = primerNombre(u);
  const sinConfirmar = !u.email_confirmed_at;
  const cuerpo = `
    <p style="margin:0 0 14px;">${nombre ? "Hola, " + esc(nombre) + ":" : "Hola:"}</p>
    <p style="margin:0 0 14px;">Gracias por registrarse en RumeApp. ${sinConfirmar
      ? "Para terminar, solo falta confirmar su correo electrónico."
      : "Su cuenta ya está activa; solo falta crear su finca."}</p>
    <p style="margin:0 0 14px;">Con el botón de abajo ${sinConfirmar ? "su correo queda confirmado y usted ingresa" : "usted ingresa"} directamente a la aplicación, sin necesidad de código ni contraseña. Allí solo tendrá que escribir el nombre de su finca para empezar a registrar sus animales, gastos y labores.</p>
    <p style="margin:0;color:rgba(239,232,216,0.80);font-size:14px;">El plan gratuito no tiene fecha de vencimiento ni requiere tarjeta de crédito.</p>`;
  return {
    asunto: nombre ? `${nombre}, su cuenta en RumeApp está casi lista` : "Su cuenta en RumeApp está casi lista",
    html: marco(
      "Su cuenta está casi lista",
      cuerpo,
      BOTON(await enlaceAcceso(u.id, "inicio", 14), "Terminar mi registro"),
      "Recibe este correo porque se registró en RumeApp con esta dirección. Si no fue usted, puede ignorarlo.",
    ),
  };
}

async function correoDia2(u: User, finca: string, animales: number): Promise<{ asunto: string; html: string }> {
  const nombre = primerNombre(u);
  const punto = (marca: string, titulo: string, texto: string) => `
    <tr><td valign="top" style="padding:10px 14px 10px 0;"><span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:13px;background:#B8CE7A;color:#14261A;font-weight:bold;font-size:13px;">${marca}</span></td>
        <td style="padding:10px 0;color:#EFE8D8;font-size:15px;line-height:1.55;"><b style="color:#B8CE7A;">${titulo}</b><br>${texto}</td></tr>`;
  const sinAnimales = animales === 0;
  const cuerpo = `
    <p style="margin:0 0 14px;">${nombre ? "Hola, " + esc(nombre) + ":" : "Hola:"}</p>
    <p style="margin:0 0 14px;">Desde RumeApp puede llevar el control de peso y de producción de leche de <b style="color:#B8CE7A;">${esc(finca)}</b>. Registrar cada dato toma menos de un minuto.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
      ${sinAnimales ? punto("✓", "Antes de empezar", "Registre sus animales. Si los tiene en un cuaderno o en Excel, tómele una foto: RumeApp lee la lista y los carga por usted.") : ""}
      ${punto("1", "Control de peso", "Registre el peso de cada animal, tomado con báscula o con cinta bovinométrica. A partir del segundo pesaje, RumeApp calcula la ganancia diaria de peso.")}
      ${punto("2", "Producción de leche", "Registre los litros de cada vaca en el ordeño de la mañana y de la tarde. RumeApp totaliza la producción del día y le muestra su evolución semanal.")}
    </table>
    <p style="margin:0;color:rgba(239,232,216,0.80);font-size:14px;">Con estos registros sabrá con certeza qué animales están rindiendo y cuáles necesitan atención.</p>`;
  const botones = sinAnimales
    ? BOTON(await enlaceAcceso(u.id, "animales", 7), "Registrar mis animales")
    : `${BOTON(await enlaceAcceso(u.id, "peso", 7), "Registrar un pesaje")}
       <div style="height:14px;line-height:14px;">&nbsp;</div>
       ${BOTON_SECUNDARIO(await enlaceAcceso(u.id, "leche", 7), "Registrar la producción de hoy")}`;
  return {
    asunto: nombre
      ? `${nombre}, controle el peso y la producción de leche de su hato`
      : "Controle el peso y la producción de leche de su hato",
    html: marco(
      "Control de peso y producción de leche",
      cuerpo,
      botones,
      `Recibe este correo porque creó la finca ${esc(finca)} en RumeApp. <a href="${await enlaceBaja(u.id)}" style="color:rgba(239,232,216,0.55);">Dejar de recibir estos correos</a>.`,
    ),
  };
}

function fechaLarga(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long" }).format(new Date(iso));
}

async function correoPrueba(
  u: User, finca: string, animales: number, finISO: string, terminada: boolean,
): Promise<{ asunto: string; html: string }> {
  const nombre = primerNombre(u);
  const fin = fechaLarga(finISO);
  const { data: cupos } = await admin.rpc("cupos_fundador");
  const cuposFundador = typeof cupos === "number" ? cupos : 0;
  const cupo = "hasta 5 animales";
  const registrados = animales === 1 ? "1 animal registrado" : `${animales} animales registrados`;
  const cuerpo = `
    <p style="margin:0 0 14px;">${nombre ? "Hola, " + esc(nombre) + ":" : "Hola:"}</p>
    <p style="margin:0 0 14px;">${terminada
      ? `La prueba gratuita del plan Ganadero de <b style="color:#B8CE7A;">${esc(finca)}</b> terminó el ${fin}.`
      : `La prueba gratuita del plan Ganadero de <b style="color:#B8CE7A;">${esc(finca)}</b> termina el <b>${fin}</b>.`}
      Hoy tiene ${registrados}.</p>
    <p style="margin:0 0 14px;">${terminada
      ? `Toda su información sigue guardada. Su finca está ahora en el plan gratuito, que permite registrar ${cupo}; para seguir agregando animales necesita activar el plan Ganadero.`
      : `Cuando termine, la finca pasa al plan gratuito: toda su información queda guardada, pero solo podrá registrar ${cupo}.`}</p>
    ${cuposFundador > 0
      ? `<p style="margin:0 0 14px;"><b style="color:#B8CE7A;">Plan Fundador:</b> mientras haya cupos (quedan ${cuposFundador}), el plan Ganadero cuesta <b>$150.000 el año, con ese precio para siempre</b>. Si en 30 días no le sirve, le devolvemos el 100 %.</p>`
      : ""}
    <p style="margin:0 0 14px;">${cuposFundador > 0 ? "También puede pagarlo mes a mes: " : "El plan Ganadero cuesta "}$25.000 al mes (los tres primeros pagos mensuales tienen 20 % de descuento: $20.000). Se paga con tarjeta, PSE o Nequi desde la sección <b>Plan</b> de la aplicación, y se activa de inmediato.</p>`;
  return {
    asunto: terminada
      ? `Terminó la prueba del plan Ganadero de ${finca}`
      : `La prueba del plan Ganadero de ${finca} termina el ${fin}`,
    html: marco(
      terminada ? "Terminó su prueba del plan Ganadero" : "Su prueba del plan Ganadero termina pronto",
      cuerpo,
      cuposFundador > 0
        ? `${BOTON(await enlaceAcceso(u.id, "fundador", 7), "Quiero ser Fundador")}
           <div style="height:14px;line-height:14px;">&nbsp;</div>
           ${BOTON_SECUNDARIO(await enlaceAcceso(u.id, "plan", 7), "Ver todos los planes")}`
        : BOTON(await enlaceAcceso(u.id, "plan", 7), "Ver mi plan"),
      `Recibe este aviso porque su finca ${esc(finca)} tiene la prueba del plan Ganadero en RumeApp.`,
    ),
  };
}

async function enviar(a: string, correo: { asunto: string; html: string }): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [a], reply_to: "soporte@rumea.app", subject: correo.asunto, html: correo.html }),
  });
  if (!res.ok) console.error("Resend rechazó el correo", a, res.status, await res.text());
  return res.ok;
}

// ------------------------------------------------------------------- datos

async function todosLosUsuarios(): Promise<User[]> {
  // Auth responde "Database error finding users" si la página trae una cuenta
  // que no puede leer (p. ej. banned_until = 'infinity'). Entonces esa página
  // se lee de a una cuenta y se salta la dañada.
  const POR_PAGINA = 10;
  const out: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: POR_PAGINA });
    if (!error) {
      out.push(...data.users);
      if (data.users.length < POR_PAGINA) return out;
      continue;
    }
    for (let k = (page - 1) * POR_PAGINA + 1; k <= page * POR_PAGINA; k++) {
      const uno = await admin.auth.admin.listUsers({ page: k, perPage: 1 });
      if (uno.error) {
        console.warn("cuenta ilegible en la posición", k, uno.error.message);
        continue;
      }
      if (uno.data.users.length === 0) return out;
      out.push(...uno.data.users);
    }
  }
}

async function yaEnviados(tipo: string): Promise<Set<string>> {
  const { data } = await admin.from("correos_seguimiento").select("user_id").eq("tipo", tipo);
  return new Set((data ?? []).map((r) => r.user_id as string));
}

async function marcar(userId: string, tipo: string): Promise<boolean> {
  // Se marca ANTES de mandar: si dos corridas se cruzan, solo una gana el insert.
  const { error } = await admin.from("correos_seguimiento").insert({ user_id: userId, tipo });
  return !error;
}

function horaBogota(): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "numeric", hourCycle: "h23" }).format(new Date()));
}

async function contar(tabla: string, fincaId: string): Promise<number> {
  const { count } = await admin.from(tabla).select("id", { count: "exact", head: true }).eq("finca_id", fincaId);
  return count ?? 0;
}

async function faltaPaso(usuarios: User[]): Promise<string[]> {
  const ahora = Date.now();
  const [{ data: duenos }, { data: miembros }, enviados] = await Promise.all([
    admin.from("fincas").select("owner_user_id"),
    admin.from("finca_miembros").select("user_id"),
    yaEnviados("falta_paso"),
  ]);
  const conFinca = new Set([
    ...(duenos ?? []).map((r) => r.owner_user_id as string),
    ...(miembros ?? []).map((r) => r.user_id as string),
  ]);
  const enviadosA: string[] = [];
  for (const u of usuarios) {
    const edad = ahora - new Date(u.created_at).getTime();
    if (edad < 2 * HORA || edad > 14 * DIA) continue;
    if (!u.email || enviados.has(u.id) || conFinca.has(u.id)) continue;
    if ((u as { banned_until?: string }).banned_until) continue;
    if (!(await marcar(u.id, "falta_paso"))) continue;
    if (await enviar(u.email, await correoFaltaPaso(u))) enviadosA.push(u.email);
  }
  return enviadosA;
}

async function dia2(usuarios: User[]): Promise<string[]> {
  const ahora = Date.now();
  const desde = new Date(ahora - 10 * DIA).toISOString();
  const hasta = new Date(ahora - 20 * HORA).toISOString();
  const [{ data: fincas }, { data: bajas }, enviados] = await Promise.all([
    admin.from("fincas").select("id, nombre, owner_user_id").gte("created_at", desde).lte("created_at", hasta)
      .order("created_at"),
    admin.from("user_profiles").select("user_id").eq("recordatorios_correo", false),
    yaEnviados("dia2"),
  ]);
  const deBaja = new Set((bajas ?? []).map((r) => r.user_id as string));
  const porId = new Map(usuarios.map((u) => [u.id, u]));
  const enviadosA: string[] = [];
  for (const f of fincas ?? []) {
    const u = porId.get(f.owner_user_id);
    if (!u?.email || enviados.has(u.id) || deBaja.has(u.id)) continue;
    const [animales, pesajes, leche] = await Promise.all([
      contar("animales", f.id), contar("pesajes", f.id), contar("produccion_leche", f.id),
    ]);
    if (pesajes + leche > 0) continue; // ya lo usa: no hace falta
    if (!(await marcar(u.id, "dia2"))) continue;
    enviados.add(u.id); // un dueño con varias fincas nuevas recibe uno solo
    if (await enviar(u.email, await correoDia2(u, f.nombre, animales))) enviadosA.push(u.email);
  }
  return enviadosA;
}

async function avisosPrueba(usuarios: User[]): Promise<string[]> {
  const ahora = Date.now();
  const { data: fincas } = await admin.from("fincas").select("id, nombre, owner_user_id, trial_ends_at")
    .not("trial_ends_at", "is", null).eq("plan_pagado", false)
    .gte("trial_ends_at", new Date(ahora - 2 * DIA).toISOString())
    .lte("trial_ends_at", new Date(ahora + 3 * DIA).toISOString());
  const porId = new Map(usuarios.map((u) => [u.id, u]));
  const enviadosA: string[] = [];
  for (const f of fincas ?? []) {
    const u = porId.get(f.owner_user_id);
    if (!u?.email) continue;
    const terminada = new Date(f.trial_ends_at).getTime() <= ahora;
    if (!(await marcar(u.id, `${terminada ? "prueba_fin" : "prueba_aviso"}:${f.id}`))) continue;
    const correo = await correoPrueba(u, f.nombre, await contar("animales", f.id), f.trial_ends_at, terminada);
    if (await enviar(u.email, correo)) enviadosA.push(u.email);
  }
  return enviadosA;
}

// ------------------------------------------------------------------ handler

async function acceso(url: URL): Promise<Response> {
  const u = url.searchParams.get("u") ?? "";
  const e = Number(url.searchParams.get("e") ?? 0);
  const r = url.searchParams.get("r") ?? "inicio";
  const t = url.searchParams.get("t") ?? "";
  const ir = (destino: string) => new Response(null, { status: 302, headers: { Location: destino } });

  if (!RUTAS[r] || !e || e * 1000 < Date.now() || t !== (await firmar(`acceso:${u}:${e}:${r}`))) {
    return ir(APP + "/"); // vencido o alterado: que entre con su clave
  }
  const { data, error } = await admin.auth.admin.getUserById(u);
  const user = data?.user;
  if (error || !user?.email) return ir(APP + "/");
  if (!user.email_confirmed_at) {
    // Tocar el botón del correo demuestra que el correo es suyo.
    await admin.auth.admin.updateUserById(u, { email_confirm: true });
  }
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email: user.email });
  const hash = link?.properties?.hashed_token;
  if (linkErr || !hash) {
    console.error("generateLink falló", linkErr);
    return ir(APP + "/");
  }
  const destino = new URL(APP + RUTAS[r]);
  destino.searchParams.set("acceso", hash);
  return ir(destino.toString());
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET") return acceso(url);
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405 });
  if (!NOTIFY_SECRET || req.headers.get("x-notify-secret") !== NOTIFY_SECRET) {
    return new Response("No autorizado", { status: 401 });
  }
  let body: { prueba?: string; user_id?: string; a?: string } = {};
  try {
    body = await req.json();
  } catch { /* cron manda {} */ }

  if (body.prueba) {
    if (!body.user_id || !body.a) return new Response("Faltan user_id y a", { status: 400 });
    const { data } = await admin.auth.admin.getUserById(body.user_id);
    if (!data?.user) return new Response("Usuario no encontrado", { status: 404 });
    let correo;
    if (body.prueba === "falta_paso") {
      correo = await correoFaltaPaso(data.user);
    } else if (body.prueba === "prueba_aviso" || body.prueba === "prueba_fin") {
      const { data: f } = await admin.from("fincas").select("id, nombre").eq("owner_user_id", body.user_id)
        .order("created_at").limit(1).maybeSingle();
      correo = await correoPrueba(data.user, f?.nombre ?? "su finca", f ? await contar("animales", f.id) : 0,
        new Date(Date.now() + 3 * DIA).toISOString(), body.prueba === "prueba_fin");
    } else {
      const { data: f } = await admin.from("fincas").select("id, nombre").eq("owner_user_id", body.user_id)
        .order("created_at").limit(1).maybeSingle();
      correo = await correoDia2(data.user, f?.nombre ?? "su finca", f ? await contar("animales", f.id) : 0);
    }
    const ok = await enviar(body.a, correo);
    return Response.json({ ok }, { status: ok ? 200 : 502 });
  }

  try {
    const usuarios = await todosLosUsuarios();
    const enHorario = horaBogota() >= 6 && horaBogota() < 19;
    const resumen = {
      falta_paso: await faltaPaso(usuarios),
      dia2: enHorario ? await dia2(usuarios) : "fuera de horario",
      prueba: enHorario ? await avisosPrueba(usuarios) : "fuera de horario",
    };
    console.log("seguimiento", JSON.stringify(resumen));
    return Response.json(resumen);
  } catch (err) {
    console.error("seguimiento falló", err);
    return new Response(`Error: ${(err as Error)?.message ?? JSON.stringify(err)}`, { status: 500 });
  }
});
