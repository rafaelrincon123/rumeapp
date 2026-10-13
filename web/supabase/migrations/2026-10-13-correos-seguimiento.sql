-- Correos de seguimiento (Edge Function `seguimiento`), cada hora:
--   · "falta_paso": registros que no pusieron el código o no crearon finca.
--   · "dia2": fincas nuevas sin pesajes ni leche → cómo llevar peso y ordeño.

-- 1) Registro de envíos: uno por persona y tipo. Solo lo usa la Edge Function
--    (service_role): RLS activa y sin políticas = ningún usuario lo ve.
create table if not exists public.correos_seguimiento (
  user_id    uuid not null,
  tipo       text not null,
  enviado_en timestamptz not null default now(),
  primary key (user_id, tipo)
);
alter table public.correos_seguimiento enable row level security;

-- 2) Programador: minuto 15 de cada hora.
create or replace function privado.disparar_seguimiento() returns void
language plpgsql
security definer
set search_path = public, privado, extensions
as $$
declare
  v_url    text;
  v_secret text;
begin
  select replace(valor, 'notificar-admin', 'seguimiento') into v_url
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

select cron.unschedule('seguimiento-horario')
  where exists (select 1 from cron.job where jobname = 'seguimiento-horario');
select cron.schedule('seguimiento-horario', '15 * * * *', 'select privado.disparar_seguimiento()');
