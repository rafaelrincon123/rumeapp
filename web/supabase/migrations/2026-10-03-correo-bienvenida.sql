-- Correo de bienvenida automático al crear la PRIMERA finca de un usuario.
--
-- Llama a la Edge Function correo-bienvenida (desde soporte@rumea.app) con
-- pg_net, igual que notificar_admin: misma URL base y mismo secreto de
-- privado.config. Si el dueño ya tenía otra finca no se manda (no es nuevo).
-- Un fallo aquí nunca impide crear la finca.

create or replace function privado.tg_correo_bienvenida() returns trigger
language plpgsql
security definer
set search_path = public, privado, extensions
as $$
declare
  v_url    text;
  v_secret text;
begin
  if exists (
    select 1 from fincas f
    where f.owner_user_id = new.owner_user_id and f.id <> new.id
  ) then
    return null;
  end if;

  select replace(valor, 'notificar-admin', 'correo-bienvenida') into v_url
    from privado.config where clave = 'notify_url';
  select valor into v_secret from privado.config where clave = 'notify_secret';
  if v_url is null or v_secret is null then
    return null;
  end if;

  perform net.http_post(
    url     := v_url,
    body    := jsonb_build_object('finca_id', new.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', v_secret
    )
  );
  return null;
exception when others then
  raise warning 'correo_bienvenida(%) falló: %', new.id, sqlerrm;
  return null;
end;
$$;

drop trigger if exists trg_correo_bienvenida on fincas;
create trigger trg_correo_bienvenida
  after insert on fincas
  for each row execute function privado.tg_correo_bienvenida();
