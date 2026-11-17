# RumeApp — Resumen del proyecto

> App web multi-tenant para control ganadero en Colombia. Un consolidado de qué es, cómo está construida, qué se ha hecho y dónde está parado el proyecto hoy (2026-11-17).

---

## 1. Qué es RumeApp

- SaaS para ganaderos colombianos: cada finca administra animales, potreros, sanidad, reproducción, tareas, gastos (con reparto entre socios), inventario, control de peso y producción de leche.
- Multi-especie: **bovino, bufalino, caprino, ovino, equino, porcino, aves** (lotes de ponedoras, engorde, levante, campo).
- El dato real "semilla" es la finca original **Las Delicias** (del propio Rafael) con 4 socios (25 % c/u).
- Marca: **RumeApp** (en `rumea.app`). Logo = badge verde bosque con cabeza de toro geométrica lime.

**Stack**
- Frontend: **Next.js 14** (App Router, TS, Tailwind), desplegado en **Vercel Pro**.
- Backend: **Supabase** (Postgres + Auth + Realtime + Storage + Edge Functions + pg_cron + pg_net).
- Correos: **Resend** (dominio `rumea.app` verificado; SMTP propio para Supabase Auth).
- Pagos: **Bold** (checkout + webhook); plan Fundador y planes recurrentes.
- IA: **Anthropic (Claude Opus)** para leer fotos del cuaderno.
- Analítica: Vercel Analytics + Meta Pixel + API de Conversiones.

---

## 2. Estructura del repositorio

```
C:\Users\EQUIPO\Ganaderia las delicias\
├── README.md
├── HANDOFF.md                  ← guía para retomar desde otro PC
├── RUMEAPP-RESUMEN.md          ← este archivo
├── marketing/                  ← fotos, reels, correos, curso, ventas (gitignored en parte)
│   ├── correos/
│   ├── curso/                  ← guía "Ganadería rentable" en PDF + capítulos .md
│   ├── landing/
│   ├── redes/                  ← scripts PIL + Kie.ai + reels
│   └── ventas/                 ← Ruta B: mensajes y plan de WhatsApp
├── supabase/                   ← carpeta suelta de CLI
└── web/
    ├── src/
    │   ├── app/                ← rutas Next.js (App Router)
    │   │   ├── animales/  cuenta/  equipo/  funciones/  gastos/
    │   │   ├── hato/  inventario/  lotes/  mi-operacion/
    │   │   ├── panel/  peso/  plan/  potreros/  precios/
    │   │   ├── preguntas/  privacidad/  produccion/  reproduccion/
    │   │   ├── sanidad/  socios/  tareas/  terminos/
    │   │   ├── manifest.ts  robots.ts  sitemap.ts
    │   │   ├── opengraph-image.png  twitter-image.png  apple-icon.png
    │   │   └── layout.tsx  page.tsx  globals.css  error.tsx  global-error.tsx
    │   ├── components/         ← 36 componentes (ver más abajo)
    │   └── lib/                ← 29 módulos (ver más abajo)
    ├── supabase/
    │   ├── schema.sql
    │   ├── seed.sql
    │   ├── realtime.sql
    │   ├── config.toml
    │   ├── migrations/         ← 29 migraciones desde 2026-07-29
    │   ├── scripts/            ← one-offs
    │   └── functions/          ← Edge Functions (Deno)
    │       ├── _shared/
    │       ├── bold-pago/      bold-webhook/
    │       ├── cambiar-clave-empleado/  crear-empleado/
    │       ├── correo-bienvenida/  correo-entrante/  correo-manual/
    │       ├── leer-cuaderno/  notificar-admin/
    │       ├── recordatorios/  seguimiento/
    └── public/                 ← logos, íconos, pantallas de la app, piezas de ads
```

**Rama principal:** `main`.
**Repo:** `https://github.com/rafaelrincon123/rumeapp` (antes `las-delicias`).
**Dominios activos:** `rumea.app` (principal), `www.rumea.app` (redirect 308), `rumeapp.vercel.app`, `las-delicias-mddw.vercel.app` (viejo, aún sirve).

---

## 3. Componentes y módulos clave

**Componentes (`web/src/components/`)**
- `AuthGate.tsx`, `NavShell.tsx`, `Header.tsx`, `Sidebar.tsx`, `BottomNav.tsx`
- `LandingPage.tsx` (secciones públicas: inicio, funciones, precios, preguntas)
- `SignupWizard.tsx` (1 pantalla), `OnboardingWizard.tsx`, `CodigoConfirmacion.tsx`
- `PricingCards.tsx` + `PromoBanner`, `CalculadoraPerdidas.tsx`
- `OfertaPrueba.tsx`, `OfertaFundador.tsx`, `PlanUsageBanner.tsx`
- `Tutorial.tsx` (`RecorridoBienvenida` + `PrimerosPasos`)
- `SyncToaster.tsx` (reintentos en red caída), `ErrorReporter.tsx`
- `ExportarPDFButton.tsx`, `PhotoInput.tsx`, `PastureMap.tsx`, `HomeArt.tsx`
- `SelectorEspecie.tsx`, `PlanSanitario.tsx`, `RegistroVarios.tsx`
- `AyudaWhatsApp.tsx`, `CapturarReferido.tsx`, `MetaPixel.tsx`
- `StatCard.tsx`, `HeroStat.tsx`, `Sparkline.tsx`, `AreaChart.tsx`, `Modal.tsx`, `FormRow.tsx`, `EmptyState.tsx`, `PasswordInput.tsx`, `IngresoForm.tsx`, `icons.tsx`

**Lib (`web/src/lib/`)**
- `supabase.ts`, `auth.ts`, `useAuth.ts`, `useFincaActiva.ts`, `useDB.ts`, `db.ts`
- `plans.ts` (planes, promos, especies permitidas, cupos Fundador)
- `especies.ts`, `planSanitario.ts`, `lotes.ts`, `animalesForm.ts`
- `bold.ts`, `comprobantePago.ts`, `contacto.ts`, `referido.ts`
- `leerCuaderno.ts` (fotos del cuaderno → Claude)
- `pdfReport.ts` (jsPDF + autotable con lazy import)
- `pixel.ts`, `reportarError.ts`, `colombia.ts` (departamentos), `format.ts`, `participacion.ts`, `storage.ts`
- `cuenta.ts`, `equipo.ts`, `gastos.ts`, `actividad.ts`, `tutorial.ts`, `types.ts`

---

## 4. Supabase — migraciones (orden cronológico)

1. `2026-07-29-sync-sheet.sql`
2. `2026-07-30-gastos-pagado-por-ids.sql`
3. `2026-08-18-gastos-reparto-por-cabezas.sql`
4. `2026-08-18-sanidad-completada.sql`
5. `2026-08-18-servicios-completada.sql`
6. `2026-09-21-multi-tenant.sql` — **fundacional**: `fincas`, `finca_id` en cada tabla, RLS por finca, migración de datos de Las Delicias.
7. `2026-09-21-fix-rls-recursion.sql` — helpers `is_finca_member` / `is_finca_owner`.
8. `2026-09-21-socios-rpcs.sql`
9. `2026-09-22-user-profiles-y-planes.sql` — tabla `user_profiles`, triggers `enforce_animales_limit`/`enforce_miembros_limit`, vista `plan_limits`.
10. `2026-09-22-trial-y-nuevos-planes.sql` — `trial_ends_at`, `plan_pagado`, `plan_efectivo(finca_id)`.
11. `2026-09-22-roles-y-permisos.sql` — RLS por rol en 13 tablas, trigger `protect_owner_membership`.
12. `2026-09-22-vincular-socio-a-miembro.sql`
13. `2026-09-23-avatar-perfil.sql`
14. `2026-09-23-comprobantes-pago.sql`
15. `2026-09-23-notificaciones-y-errores.sql` — `pg_net`, `privado.config`, `errores_app`, dispara `notificar-admin`.
16. `2026-09-23-periodo-pago.sql`
17. `2026-09-24-sin-prueba-gratis.sql`
18. `2026-10-03-correo-bienvenida.sql` — trigger a Edge Function de bienvenida.
19. `2026-10-03-recordatorios-diarios.sql` — pg_cron 11 UTC → "Hoy toca".
20. `2026-10-05-pagos-bold.sql` — `pagos_bold`, `plan_pagado_hasta`, `activar_pago_bold`.
21. `2026-10-05-prueba-ganadero-y-proteger-plan.sql` — trigger `proteger_plan_finca`, RPC `iniciar_prueba_ganadero`.
22. `2026-10-06-regalo-pago-bold.sql` — envío del PDF al aprobarse un pago.
23. `2026-10-13-correos-seguimiento.sql` — cron horario, "falta_paso" y "dia2".
24. `2026-10-13-fundador-y-cuaderno.sql` — plan Fundador + `lecturas_cuaderno`.
25. `2026-10-19-especies-y-plan-sanitario.sql`
26. `2026-10-20-cerdos-aves-y-lotes.sql`
27. `2026-10-20-limite-lotes.sql`
28. `2026-11-05-fundador-full-100-cupos.sql`
29. `2026-11-05-referidos.sql` — `codigo_referido`, `creditos_referido`, `otorgar_credito_referido`.

> Script del 2026-10-22 pendiente: `scripts/2026-10-22-correo-manual-cristian.sql` (sin aplicar, aún como "untracked").

---

## 5. Edge Functions (Deno)

| Función | Para qué |
|---|---|
| `crear-empleado` | Owner/admin crea cuentas de equipo ya confirmadas, con rol y password temporal. |
| `cambiar-clave-empleado` | Reset de password solo para empleados únicos de la finca. |
| `correo-bienvenida` | Trigger al crear primera finca → correo desde `soporte@rumea.app`. |
| `correo-entrante` | Webhook Resend `email.received` → reenvía todo `@rumea.app` al Gmail con Reply-To. |
| `correo-manual` | Envío puntual (ej. Cristian 2026-10-22). |
| `notificar-admin` | Nueva finca / solicitud de pago / errores → correo a Rafael. |
| `recordatorios` | Cron diario 6:00 a.m. Bogotá → correo "Hoy toca" (atrasado/hoy/mañana, tareas + sanidad + partos). |
| `seguimiento` | Cron horario → "falta_paso", "dia2", "prueba_aviso", "prueba_fin"; respeta opt-out. |
| `bold-pago` | Crea orden Bold (plan + periodo, incluye Fundador). |
| `bold-webhook` | Recibe aprobación Bold → `activar_pago_bold` + correo con PDF + aviso a admin + referido. |
| `leer-cuaderno` | 1–4 fotos → Claude Opus (JSON schema) → animales detectados, tope 20/día por user. |

---

## 6. Historia abreviada (cronología de commits y decisiones)

### 2026-07 → 08 · App single-tenant "Las Delicias"
- Home de 4 tiles, control de peso, multi-selección en tareas, realtime Supabase, reparto de gastos entre socios con deudas.

### 2026-09-21 · Fase 1 — Multi-tenant + Landing pública
- `fincas`, `finca_miembros`, RLS por `finca_id`. Backfill a "Las Delicias".
- Landing estilo Axolotl (Space Grotesk, verde bosque `#14261A` + lime `#B8CE7A`, phones mockup con la UI real).

### 2026-09-22 · Rebrand → RumeApp + Fase 2
- Marca RumeApp (Kie.ai: badge toro geométrico), repo renombrado a `rumeapp`.
- SignupWizard (3 pasos → después 1), `/plan`, límites por plan vía triggers, `PlanUsageBanner`.
- Edge Function `crear-empleado` (service_role, auto-confirm), `/equipo` con UI de roles.
- Fix crítico: "Cuenta sin vincular" tras `crear_finca` (await `initDB()` antes del evento).

### 2026-09-23 · Dominio propio + SMTP + legales
- `rumea.app` reclamado (error: no era `rumeapp.app`, se quedó con `rumea.app`).
- Resend como SMTP de Supabase Auth (noreply@rumea.app). Plantillas de correo en español con marca.
- Vercel Pro ($20/mes), Analytics + Speed Insights.
- `SyncToaster` (guardados offline con reintentos), honestidad en landing (quitó "offline" falso).
- `/terminos` y `/privacidad` (Ley 1581 + Habeas Data Colombia).
- `/cuenta` (foto perfil, cambiar correo/clave, cerrar sesión).
- PricingCards única fuente de verdad. Precios en COP (sin USD): Pro $25.000/mes, Full $55.000/mes, anual −20 % luego −25 %.
- Meta Pixel 1403461817861345 activo. Página FB + IG @rumea.app + 5 historias + reel.
- Avisos automáticos por correo (nueva finca, pago, errores). Calculadora de pérdidas.

### 2026-09-24 → 10-03 · Simplificación de registro + Primeros usuarios
- Se quitó la prueba de 30 días (nuevas fincas arrancan en Ranchero/Gratuito).
- Confirmación por **código de 6 dígitos**. Registro simplificado a 1 pantalla.
- Landing partida: `/`, `/funciones`, `/precios`, `/preguntas`.
- Tutorial de primeros pasos (`RecorridoBienvenida` + `PrimerosPasos`).
- Correo diario "Hoy toca" (cron 6:00 a.m.). Correos de seguimiento (falta_paso + día 2).
- Primera usuaria real: **Mery García** (San Jerónimo, 2026-10-03).

### 2026-10-05 → 10-06 · Pagos Bold en producción
- `bold-pago` + `bold-webhook` desplegados con HMAC. Llaves de producción.
- `activar_pago_bold` suma periodo, marca `plan_pagado=true`.
- Envío automático de la **guía "Ganadería rentable: guía práctica para la finca colombiana"** (55 pág., 100 % original, en `marketing/curso/`) al aprobarse un pago.
- Trigger `proteger_plan_finca` (api de usuario ya no cambia plan).
- 20 % de bienvenida (3 primeros mensuales por finca) + anual al 25 %.

### 2026-10-13 · Plan Fundador + Lectura de cuaderno
- **Fundador**: Ganadero 1 año $150.000 para siempre, 50 cupos, hasta 31-oct-2026 (Rafael rechazó contadores falsos de cupos).
- **Lectura de cuaderno**: Edge Function `leer-cuaderno` con Claude Opus (JSON schema), 1–4 fotos, 20/día por user. Prueba sintética: 8/8 animales correctos, ~US$0,024/foto.
- Correos de fin de prueba Ganadero.
- Pauta Meta re-optimizada por **CompleteRegistration** en conjunto nuevo (Meta no deja cambiar el evento in-place).

### 2026-10-19 → 10-20 · Multi-especie + Lotes + Anuncios v3
- Especies: bovino / bufalino / caprino / ovino / equino / porcino.
- Plan sanitario automático por especie (`lib/planSanitario.ts`).
- Módulo `/lotes` (ponedoras, engorde, campo, levante_ceba) con `lotes` + `registros_lote`.
- Gratuito limitado a 1 lote activo.
- Anuncios v3 (P1–P6) en pauta Meta con 4:5 y 9:16 por placement.

### 2026-10-26 · **Ruta B — venta directa (30 días sin pauta)**
- Tras 1 mes: 148 cuentas, 90 fincas externas, **solo 1 finca volvió otro día, 0 activas en 7 días, 0 pagos reales**.
- Rafael elige Ruta B: pausar pauta y funciones nuevas durante 30 días; carga manual de hatos (fotos de cuaderno), contacto por WhatsApp (nunca llamadas).
- Botón de **WhatsApp Business** `https://wa.me/message/KTQLJUOQQBQMK1` en web, `/plan` y `/cuenta` (`lib/contacto.ts`).
- Prueba "carga por audio de WhatsApp" (sólo planes pagos; manual hasta 2026-11-09, luego decide si automatizar).
- **Meta al 30-nov-2026**: 10 fincas usando 2+ días/semana + 3 pagos reales. Si no se cumple pero hay señal → pivotar (WhatsApp-first / asesores). Si nada → Ruta D (pausar el proyecto).

### 2026-11-05 · Reestructura de planes + Referidos
- Planes renombrados en UI: **Gratuito / Pro / Full** (ids técnicos BD sin cambio).
- Límite de especies por plan: Gratuito=2, Pro=4, Full=todas (`maxEspecies` en `plans.ts`, `SelectorEspecie` con candado).
- **Fundador rediseñado**: ahora es **Full por $100.000/año**, **100 cupos**, sin fecha límite visible. Al año pasa a Full al precio normal.
- **Curso con doble gate**: la guía solo se adjunta si la finca tiene ≥1 bovino activo (la guía es 100 % bovino).
- **Programa de referidos "Invite y gane"**:
  - `user_profiles.codigo_referido` único (6 chars sin O/0/I/1/L). Rafael: `7P92PT`.
  - Link `rumea.app/?r=XXXXXX` → `CapturarReferido` guarda en localStorage 60 días.
  - Primer pago del referido → **30 días** a la finca del referidor con fecha más lejana (si está en plan pago activo). Si está en Gratuito, pierde el crédito.
  - UI en `/cuenta` → `ReferidosCard` (copiar, compartir por WhatsApp, contadores).
  - Correos: aviso al referidor + fila "Referidor" en aviso a admin.

### 2026-11-08 → 11-13 · Micro-ajustes de onboarding y UI
- Línea de tiempo de toda la finca con filtros en `/mi-operacion`.
- Gallinas y lotes visibles para quien llega del anuncio.
- Botón WhatsApp Business en web y pantalla Plan/Mi cuenta.

---

## 7. Infraestructura, credenciales y operación

- **Vercel Pro** (tarjeta MasterCard ...4472 vía Stripe Link). Analytics + Speed Insights activos.
- **Dominio `rumea.app`** reclamado con el year gratis del plan Pro (auto-renueva 23-sep-2027 a US$15/año). `metadataBase` apunta allí.
- **Supabase Free** (proyecto `tfluitgarqtdjdbxugmq`). Upgrade a Pro **pospuesto**; retomarlo solo cuando (a) un usuario real ajeno dependa de la app, o (b) nadie vaya a entrar por 7+ días.
- **Resend Free** (100 correos/día): dominio `rumea.app` verificado con DKIM/SPF/DMARC; `soporte@rumea.app` con inbound → reenvía al Gmail de Rafael.
- **Bold**: llaves de PRODUCCIÓN (pagos reales). Webhook `https://tfluitgarqtdjdbxugmq.supabase.co/functions/v1/bold-webhook`. Comercio aún figura como "RAVE STORE" (pendiente renombrar).
- **Anthropic API**: `ANTHROPIC_API_KEY` en Supabase secrets (Rafael la rotó tras el primer leak accidental).
- **Variables sensibles** en `.env.local` y Vercel (nunca hardcoded): cuenta bancaria, Nequi, Daviplata.
- **Meta Business**:
  - Portafolio **RumeApp** `4484866435163051`
  - Cuenta publicitaria **1060818686792868** (COP)
  - Página FB `1274050289132625`
  - Instagram `@rumea.app` `17841431733457701`
  - Píxel `1403461817861345` con API de Conversiones.

---

## 8. Marketing y contenido

- **Landing**: Space Grotesk, paleta forest/lime/sand, Hero + Funciones + Precios + Calculadora de pérdidas + Preguntas.
- **Correos de marca**: 6 plantillas de Supabase Auth en español con marca RumeApp.
- **Guía de regalo**: `Guia-practica-ganaderia-RumeApp.pdf` (55 pág., 12 capítulos + anexos, en `marketing/curso/`, construida con `construir.py` a partir de `capitulos/*.md`).
- **Redes**:
  - `marketing/redes/`: PIL + Space Grotesk; Kie.ai (nano-banana-2) para fondos; textos con código (la IA escribe mal tildes/cifras).
  - Posts orgánicos v2 y v3 (sanidad, cerdos, aves, multiespecie, Fundador).
  - Reels (Hailuo 2.3 + ffmpeg + capturas reales de la app). Reel de vacunas en Drive.
- **Ruta B (venta directa)**: `marketing/ventas/MENSAJES-EXACTOS.md`, `PLAN-EXACTO-MENSAJES.md`, `PLAN-SEMANA-1.md`, `PRUEBA-CARGA-POR-AUDIO.md`, carpeta `whatsapp/`.
- **Drive 1Yf67P3n…**: destino de todo material finalizado (subir por Chrome).

---

## 9. Precios vigentes (noviembre 2026)

| Plan | Precio mensual | Precio anual (−25 %) | Animales | Equipo | Fincas | Especies |
|---|---|---|---|---|---|---|
| **Gratuito** | $0 | — | 5 | 1 editor + 4 solo-lectura | 1 | 2 |
| **Pro** | $25.000 | $225.000 ($18.750/mes) | 50 | 5 | 3 | 4 |
| **Full** | $55.000 | $495.000 ($41.250/mes) | ilimitado | ilimitado | ilimitado | todas |
| **Fundador** | — | **$100.000/año (para siempre)** | Full | Full | Full | todas |

- **Bienvenida**: 20 % de descuento en los **3 primeros** pagos mensuales por finca.
- **Fundador**: 100 cupos (público), sin fecha límite visible; tras 1 año, renueva como Full al precio normal.
- **Garantía**: 30 días (refund manual por Bold).
- **Regalo**: guía PDF de ganadería (solo si la finca tiene ≥1 bovino activo).
- **Referidos**: 30 días de extensión al referidor en su finca pagada por cada primer pago de un referido.

---

## 10. Dónde está parado (estado al 2026-11-17)

- **Ruta B activa** (venta directa, sin pauta nueva ni funciones nuevas). Primera revisión semanal: 2026-11-01. **Meta al 30-nov-2026**: 10 fincas activas 2+ días/semana + 3 pagos reales.
- Programa de referidos "Invite y gane" en producción desde 2026-11-05.
- Planes renombrados (Gratuito/Pro/Full), Fundador a $100k × 100 cupos.
- Curso solo se adjunta con bovino en la finca.
- WhatsApp Business de RumeApp conectado y visible en la app.
- Pendientes abiertos:
  - Textos de `OfertaPrueba.tsx` aún no mencionan el límite de especies.
  - Renombrar comercio en Bold ("RAVE STORE" → RumeApp).
  - Supabase Pro pendiente (solo si crece la actividad).
  - Evaluar el 2026-11-09 si la "carga por audio de WhatsApp" se automatiza (≥3 clientes mandando ≥2 veces/semana).
  - Dominio viejo `las-delicias-mddw.vercel.app` sigue sirviendo en paralelo (decisión de Rafael dejarlo activo).
  - Offline real (service worker + persistencia entre recargas) — hoy solo hay `SyncToaster` con reintentos.

---

## 11. Gotchas aprendidos (para no repetir)

- **Variables CSS de la landing (`--forest`, `--lime`, `--sand`)** van en `:root`, no scoped a `.landing-root`. Si texto blanco aparece invisible fuera de la landing, es por eso.
- **Páginas públicas standalone** necesitan el bypass en `AuthGate.tsx` **y** en `NavShell.tsx` (ambos renderizan chrome).
- **`crearFinca()`** debe esperar a que el cache local recargue (`await initDB()`) antes de emitir eventos, o aparece "Cuenta sin vincular".
- **Edge Functions** se despliegan desde `web/` (no desde la raíz). Un deploy puede devolver 404 unos minutos por propagación, no es error real.
- **Migrar un socio** requiere sincronizar 3 tablas: `auth.users`, `finca_miembros`, `propietarios.auth_user_id`.
- **Vercel firewall** bloquea polling con curl desde la IP de la casa de Rafael. Verificar con `gh api …/status` y **una** carga en navegador.
- **Autofill del navegador** puede pre-llenar Username/Password con el Gmail personal en formularios nuevos (Supabase SMTP). Revisar siempre antes de guardar.
- **PowerShell 5.1 del equipo no acepta `&&`** — una instrucción por comando.
- **Posts/caption de Business Suite**: escribir texto primero con `type`, cerrar hashtags con Escape, saltos con Shift+Enter.
- **Datos sensibles** (cuentas bancarias, teléfonos) siempre por env var (`NEXT_PUBLIC_CUENTA_*`), nunca hardcoded (el repo es público).
- **Secretos nunca en chat**: Rafael pega él los secrets (`ANTHROPIC_API_KEY`, `BOLD_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `NOTIFY_SECRET`) en el dashboard de Supabase.
- **Dominio reclamado en Vercel**: verificar el nombre en CADA pantalla antes de confirmar (así nació `rumea.app` en vez de `rumeapp.app`).

---

> Última actualización: 2026-11-17 — commits hasta `de5121b` (`feat(referidos)`).
