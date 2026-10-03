-- Correo diario "Hoy toca" (6:00 a. m. Colombia).
--
-- pg_cron llama todos los días a la Edge Function `recordatorios`, que arma
-- por finca lo atrasado (últimos 7 días), lo de hoy y lo de mañana —actividades,
-- sanidad programada, próximas fechas de sanidad y partos previstos— y se lo
-- manda a los miembros que pueden editar (owner, admin, operario).
-- Solo se envía si hay algo; cada persona puede darse de baja.

-- 1) Preferencia por usuario (sin fila = recibe). La edita el propio usuario
--    desde /cuenta (RLS own-row ya existe en user_profiles) o el enlace de baja.
alter table public.user_profiles
  add column if not exists recordatorios_correo boolean not null default true;

-- 2) Registro de envíos: evita mandar dos veces el mismo día si el cron se
--    repite o se llama a mano. Solo lo usa la Edge Function (service_role):
--    RLS activa y sin políticas = ningún usuario lo ve ni lo toca.
create table if not exists public.recordatorios_enviados (
  fecha    date not null,
  user_id  uuid not null,
  finca_id uuid not null,
  enviado_en timestamptz not null default now(),
  primary key (fecha, user_id, finca_id)
);
alter table public.recordatorios_enviados enable row level security;

-- 3) Programador: 11:00 UTC = 6:00 a. m. en Colombia (sin horario de verano).
create extension if not exists pg_cron;

create or replace function privado.disparar_recordatorios() returns void
language plpgsql
security definer
set search_path = public, privado, extensions
as $$
declare
  v_url    text;
  v_secret text;
begin
  select replace(valor, 'notificar-admin', 'recordatorios') into v_url
    from privado.config where clave = 'notify_url';
  select valor into v_secret from privado.config where clave = 'notify_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url     := v_url,
    body    := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_secret),
    timeout_milliseconds := 120000
  );
end;
$$;

select cron.unschedule('recordatorios-diarios')
  where exists (select 1 from cron.job where jobname = 'recordatorios-diarios');
select cron.schedule('recordatorios-diarios', '0 11 * * *', 'select privado.disparar_recordatorios()');
