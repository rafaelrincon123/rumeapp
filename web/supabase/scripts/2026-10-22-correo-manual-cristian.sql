-- Correo manual a Cristian Cervantes (finca Antonia) — vencimiento de prueba Ganadero.
-- Lee notify_url (apunta a /notificar-admin) y notify_secret de privado.config,
-- cambia la ruta a /correo-manual y manda el correo vía la Edge Function.
--
-- ANTES de ejecutar:
--   1. Desplegar la Edge Function:
--      cd web
--      supabase functions deploy correo-manual
--   2. (Primero) ejecutar BLOQUE A — prueba a tu propio correo
--   3. Verificar que llega bien, y ahí sí ejecutar BLOQUE B — envío real.

-- ────────────────────────────────────────────────────────────────────────────
-- BLOQUE A: prueba a Rafael (rafael.rincong@gmail.com)
-- ────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_url  text;
  v_sec  text;
  v_req_id bigint;
begin
  select valor into v_url from privado.config where clave='notify_url';
  select valor into v_sec from privado.config where clave='notify_secret';

  select net.http_post(
    url     := replace(v_url, 'notificar-admin', 'correo-manual'),
    headers := jsonb_build_object('Content-Type','application/json','x-notify-secret', v_sec),
    body    := jsonb_build_object(
      'from',     'RumeApp <avisos@rumea.app>',
      'reply_to', 'avisos@rumea.app',
      'to',      'rafael.rincong@gmail.com',
      'subject', '[PRUEBA] Su plan Ganadero vence mañana',
      'html',    $html$<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Su plan Ganadero vence mañana</title></head><body style="margin:0;padding:0;background:#0E1B12;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0E1B12;"><tr><td align="center" style="padding:28px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#14261A;border-radius:24px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;"><tr><td style="padding:34px 32px 8px;"><img src="https://rumea.app/logo.png" width="56" height="56" alt="RumeApp" style="display:block;border:0;"><div style="margin-top:20px;display:inline-block;background:rgba(184,206,122,0.16);border:1px solid rgba(184,206,122,0.40);color:#B8CE7A;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:6px 12px;border-radius:999px;">RumeApp &middot; Gestión ganadera</div><h1 style="margin:18px 0 0;color:#EFE8D8;font-size:28px;line-height:1.15;text-transform:uppercase;letter-spacing:-0.5px;">Su plan Ganadero vence mañana</h1></td></tr><tr><td style="padding:18px 20px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#22402A;border-radius:18px;"><tr><td style="padding:26px 24px;color:#EFE8D8;font-size:16px;line-height:1.6;"><p style="margin:0 0 14px;">Buenas noches, Cristian:</p><p style="margin:0 0 14px;">Su prueba del plan Ganadero termina <b style="color:#B8CE7A;">mañana 23 de octubre a las 7:12 a.&nbsp;m.</b></p><p style="margin:0;">Para que no tenga interrupción con los <b style="color:#B8CE7A;">49 animales</b> y <b style="color:#B8CE7A;">13 gastos</b> que ya tiene registrados en Antonia, estas son las dos opciones disponibles:</p></td></tr></table></td></tr><tr><td style="padding:14px 20px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#22402A;border:2px solid #B8CE7A;border-radius:18px;"><tr><td style="padding:22px 24px 10px;"><div style="display:inline-block;background:#B8CE7A;color:#14261A;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;padding:4px 10px;border-radius:999px;">Recomendado</div><h2 style="margin:12px 0 6px;color:#EFE8D8;font-size:22px;text-transform:uppercase;letter-spacing:-0.3px;">Plan Fundador</h2><p style="margin:0 0 14px;color:#B8CE7A;font-size:20px;font-weight:bold;">$150.000 al año &middot; precio congelado para siempre</p><p style="margin:0 0 14px;color:#EFE8D8;font-size:15px;line-height:1.55;">Pago único anual que renueva al mismo valor cada año. Incluye todo el plan Ganadero más la guía <i>Ganadería rentable</i> y 30 días de garantía.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(14,27,18,0.45);border-radius:12px;margin:6px 0 14px;"><tr><td style="padding:12px 14px;color:rgba(239,232,216,0.75);font-size:13px;border-bottom:1px solid rgba(184,206,122,0.18);"></td><td style="padding:12px 14px;color:rgba(239,232,216,0.75);font-size:13px;text-align:right;border-bottom:1px solid rgba(184,206,122,0.18);">Primer año</td><td style="padding:12px 14px;color:rgba(239,232,216,0.75);font-size:13px;text-align:right;border-bottom:1px solid rgba(184,206,122,0.18);">Desde el 2.º año</td></tr><tr><td style="padding:12px 14px;color:#B8CE7A;font-size:14px;font-weight:bold;border-bottom:1px solid rgba(184,206,122,0.18);">Fundador</td><td style="padding:12px 14px;color:#EFE8D8;font-size:14px;text-align:right;border-bottom:1px solid rgba(184,206,122,0.18);">$150.000</td><td style="padding:12px 14px;color:#EFE8D8;font-size:14px;text-align:right;border-bottom:1px solid rgba(184,206,122,0.18);">$150.000</td></tr><tr><td style="padding:12px 14px;color:#EFE8D8;font-size:14px;border-bottom:1px solid rgba(184,206,122,0.18);">Ganadero mensual</td><td style="padding:12px 14px;color:#EFE8D8;font-size:14px;text-align:right;border-bottom:1px solid rgba(184,206,122,0.18);">$285.000</td><td style="padding:12px 14px;color:#EFE8D8;font-size:14px;text-align:right;border-bottom:1px solid rgba(184,206,122,0.18);">$300.000</td></tr><tr><td style="padding:12px 14px;color:#B8CE7A;font-size:14px;font-weight:bold;">Ahorro</td><td style="padding:12px 14px;color:#B8CE7A;font-size:14px;text-align:right;font-weight:bold;">$135.000</td><td style="padding:12px 14px;color:#B8CE7A;font-size:14px;text-align:right;font-weight:bold;">$150.000</td></tr></table><p style="margin:0 0 6px;color:rgba(239,232,216,0.75);font-size:13px;line-height:1.5;">Cupo abierto hasta el <b style="color:#EFE8D8;">31 de octubre</b>.</p></td></tr><tr><td align="center" style="padding:4px 24px 24px;"><a href="https://rumea.app/plan?activar=fundador" style="display:inline-block;background:#B8CE7A;color:#14261A;font-weight:bold;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:999px;text-transform:uppercase;letter-spacing:1px;">Activar plan Fundador →</a></td></tr></table></td></tr><tr><td style="padding:10px 20px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(34,64,42,0.55);border-radius:18px;"><tr><td style="padding:20px 24px;color:#EFE8D8;font-size:15px;line-height:1.55;"><h3 style="margin:0 0 6px;color:#EFE8D8;font-size:17px;text-transform:uppercase;letter-spacing:0.3px;">Plan Ganadero mensual</h3><p style="margin:0 0 10px;color:rgba(239,232,216,0.85);font-size:14px;">$20.000/mes los primeros 3 pagos (regular $25.000). Mes a mes, sin compromiso anual.</p><a href="https://rumea.app/plan" style="color:#B8CE7A;text-decoration:none;font-weight:bold;font-size:14px;">Ver plan mensual →</a></td></tr></table></td></tr><tr><td style="padding:10px 32px 6px;color:rgba(239,232,216,0.75);font-size:14px;line-height:1.6;"><p style="margin:0;">Si no renueva, su finca pasa automáticamente al plan Ranchero (gratis). Los 49 animales y 13 gastos quedan guardados, pero el ingreso de nuevos registros se limita a los primeros 5 animales hasta que active un plan.</p></td></tr><tr><td style="padding:18px 32px 8px;color:rgba(239,232,216,0.75);font-size:14px;line-height:1.6;"><p style="margin:0;">Si quiere resolver algo antes de decidir, responda este correo y agendamos 15 minutos.</p></td></tr><tr><td style="padding:22px 32px 32px;color:rgba(239,232,216,0.65);font-size:14px;line-height:1.5;">Saludos,<br>El equipo de RumeApp<br><a href="https://rumea.app/" style="color:#B8CE7A;text-decoration:none;">rumea.app</a></td></tr></table><p style="max-width:560px;margin:16px auto 0;color:rgba(239,232,216,0.40);font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;text-align:center;">Recibe este correo porque tiene una cuenta activa en RumeApp.</p></td></tr></table></body></html>$html$
    )
  ) into v_req_id;

  raise notice 'Petición pg_net id=%', v_req_id;
end $$;

-- Verificar el resultado (correr 5-10 segundos después):
select id, status_code, content::text as respuesta, error_msg
from net._http_response
order by id desc
limit 3;

-- ────────────────────────────────────────────────────────────────────────────
-- BLOQUE B: envío real a Cristian (SOLO después de validar la prueba)
-- ────────────────────────────────────────────────────────────────────────────
-- Para enviarlo: quite los comentarios de este bloque (seleccione todo el DO
-- y descoméntelo), o copie y pegue como un bloque nuevo cambiando el 'to' y
-- el 'subject' (quitando [PRUEBA]) del BLOQUE A.

-- do $$
-- declare
--   v_url text; v_sec text; v_req_id bigint;
-- begin
--   select valor into v_url from privado.config where clave='notify_url';
--   select valor into v_sec from privado.config where clave='notify_secret';
--   select net.http_post(
--     url     := replace(v_url, 'notificar-admin', 'correo-manual'),
--     headers := jsonb_build_object('Content-Type','application/json','x-notify-secret', v_sec),
--     body    := jsonb_build_object(
--       'to',      'cervantesnavarrocristian@gmail.com',
--       'subject', 'Su plan Ganadero vence mañana',
--       'html',    $html$ ...PEGAR EL MISMO HTML DEL BLOQUE A... $html$
--     )
--   ) into v_req_id;
--   raise notice 'Petición pg_net id=%', v_req_id;
-- end $$;
