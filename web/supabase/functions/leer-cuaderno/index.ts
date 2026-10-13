// Edge Function: leer-cuaderno
//
// "Mande una foto de su cuaderno y nosotros cargamos sus animales": recibe de
// 1 a 4 fotos (cuaderno a mano, Excel, planilla, lista impresa) y devuelve la
// lista de animales que Claude lee en ellas. NO guarda nada: la app muestra
// las filas para que el ganadero las revise y las guarde él.
//
// Body (JSON), con el token del usuario en Authorization:
//   { finca_id, imagenes: [{ media_type: "image/jpeg"|"image/png"|"image/webp", data: <base64> }] }
// Respuesta: { animales: [{ chapeta, nombre, categoria, edad_meses, raza }], nota }
//
// Secretos: ANTHROPIC_API_KEY.

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_IMAGENES = 4;
const MAX_BYTES_IMAGEN = 4 * 1024 * 1024; // la app las reduce antes (~1600 px)
const MAX_LECTURAS_DIA = 20; // por usuario: cada lectura cuesta

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

const CATEGORIAS = ["vaca", "novilla", "ternera", "toro", "novillo", "ternero", ""];

const ESQUEMA = {
  type: "object",
  properties: {
    animales: {
      type: "array",
      items: {
        type: "object",
        properties: {
          chapeta: { type: "string" },
          nombre: { type: "string" },
          categoria: { type: "string", enum: CATEGORIAS },
          edad_meses: { anyOf: [{ type: "integer" }, { type: "null" }] },
          raza: { type: "string" },
        },
        required: ["chapeta", "nombre", "categoria", "edad_meses", "raza"],
        additionalProperties: false,
      },
    },
    nota: { type: "string" },
  },
  required: ["animales", "nota"],
  additionalProperties: false,
};

function instrucciones(hoy: string): string {
  return `Eres el asistente de RumeApp, una app de gestión ganadera en Colombia. Te llegan fotos del registro de animales de una finca: un cuaderno escrito a mano (a veces mojado, sucio o con mala letra), una hoja de Excel, una planilla o una lista impresa. Tu trabajo es pasar cada animal a una fila, para que el ganadero la revise antes de guardarla.

Por cada animal (bovino) que aparezca, devuelve:
- chapeta: el número de identificación o de chapeta/arete tal como está escrito ("027", "A-15"). Si no tiene, "".
- nombre: el nombre del animal si tiene ("Lucero", "La Mona"). Si no tiene, "".
- categoria: una de vaca, novilla, ternera, toro, novillo, ternero. Dedúcela de lo escrito ("V", "vaca parida", "hembra de levante", "torete", "macho de ceba"…) y de la edad si hace falta: hembra que ya parió = vaca; hembra joven sin parir de más de ~1 año = novilla; hembra de menos de ~1 año = ternera; macho reproductor = toro; macho de levante/ceba de más de ~1 año = novillo; macho de menos de ~1 año = ternero. Si no hay cómo saberlo, "".
- edad_meses: edad aproximada en meses. Si hay fecha de nacimiento, calcúlala contra la fecha de hoy (${hoy}). Si dice "3 años" → 36; "8 meses" → 8. Si no hay dato, null.
- raza: tal como esté ("Brahman", "Gyr", "Cebú", "cruce", "F1"…). Si no hay, "".

Reglas:
- Una fila por animal. No inventes animales ni datos: si un dato no se lee bien, déjalo vacío. Si la misma lista aparece en varias fotos, no repitas animales.
- Ignora lo que no sea un animal: totales, gastos, fechas de vacunas sueltas, encabezados, firmas.
- Si una fila es ilegible del todo, no la incluyas y menciónalo en la nota.
- nota: una frase corta en español de Colombia, tratando al ganadero de "usted", con lo que deba revisar (por ejemplo "No se leía bien la edad de 3 animales; revísela antes de guardar."). Si todo se leyó bien, "".
- Si las fotos no muestran ningún registro de animales, devuelve animales vacío y en la nota explica qué se ve y que pruebe con una foto del cuaderno, de frente y con buena luz.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "La lectura de fotos aún no está activada. Intente más tarde." }, 503);

  let body: { finca_id?: string; imagenes?: { media_type?: string; data?: string }[] };
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
  if (uErr || !u.user) return json({ error: "Su sesión venció. Vuelva a entrar." }, 401);

  // Solo quien puede editar la finca (dueño o miembro activo que no sea solo lectura).
  const fincaId = body.finca_id ?? "";
  const { data: finca } = await admin.from("fincas").select("id, owner_user_id").eq("id", fincaId).maybeSingle();
  if (!finca) return json({ error: "Finca no encontrada" }, 404);
  if (finca.owner_user_id !== u.user.id) {
    const { data: m } = await admin.from("finca_miembros").select("rol, activo")
      .eq("finca_id", fincaId).eq("user_id", u.user.id).maybeSingle();
    if (!m?.activo || !["admin", "operario"].includes(m.rol)) {
      return json({ error: "No tiene permiso para registrar animales en esta finca" }, 403);
    }
  }

  const imagenes = (body.imagenes ?? []).filter((i) => i?.data);
  if (imagenes.length === 0) return json({ error: "No llegó ninguna foto" }, 400);
  if (imagenes.length > MAX_IMAGENES) return json({ error: `Máximo ${MAX_IMAGENES} fotos por vez` }, 400);
  for (const i of imagenes) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(i.media_type ?? "")) {
      return json({ error: "Las fotos deben ser JPG, PNG o WEBP" }, 400);
    }
    if ((i.data!.length * 3) / 4 > MAX_BYTES_IMAGEN) return json({ error: "Una de las fotos es muy pesada" }, 413);
  }

  // Tope diario por usuario (registro en lecturas_cuaderno).
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await admin.from("lecturas_cuaderno").select("id", { count: "exact", head: true })
    .eq("user_id", u.user.id).gte("created_at", desde);
  if ((count ?? 0) >= MAX_LECTURAS_DIA) {
    return json({ error: "Ya leyó muchas fotos hoy. Intente de nuevo mañana." }, 429);
  }

  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  const client = new Anthropic({ apiKey });
  let respuesta: Anthropic.Message;
  try {
    respuesta = await client.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      system: instrucciones(hoy),
      output_config: { effort: "medium", format: { type: "json_schema", schema: ESQUEMA } },
      messages: [{
        role: "user",
        content: [
          ...imagenes.map((i) => ({
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: i.media_type as "image/jpeg" | "image/png" | "image/webp",
              data: i.data!,
            },
          })),
          { type: "text" as const, text: "Pase a filas los animales de estas fotos." },
        ],
      }],
    } as Anthropic.MessageCreateParamsNonStreaming);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return json({ error: "Hay mucha gente leyendo fotos en este momento. Intente en un minuto." }, 429);
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Claude API", err.status, err.message);
      return json({ error: "No pudimos leer las fotos. Intente de nuevo." }, 502);
    }
    throw err;
  }

  await admin.from("lecturas_cuaderno").insert({
    user_id: u.user.id,
    finca_id: fincaId,
    imagenes: imagenes.length,
    tokens_entrada: respuesta.usage.input_tokens,
    tokens_salida: respuesta.usage.output_tokens,
  });

  if (respuesta.stop_reason === "refusal") {
    return json({ animales: [], nota: "No pudimos leer estas fotos. Pruebe con otra foto del cuaderno." });
  }
  const texto = respuesta.content.find((b) => b.type === "text");
  if (respuesta.stop_reason === "max_tokens" || !texto || texto.type !== "text") {
    return json({ error: "La lista es muy larga para una sola vez. Mande menos fotos por vez." }, 422);
  }
  let datos: { animales: unknown[]; nota: string };
  try {
    datos = JSON.parse(texto.text);
  } catch {
    return json({ error: "No pudimos leer las fotos. Intente de nuevo." }, 502);
  }
  return json(datos);
});
