-- ============================================================================
--  RumeApp — Prueba de 15 días del plan Ganadero + plan protegido
--
--  1. proteger_plan_finca: los usuarios (rol authenticated/anon) ya NO pueden
--     cambiar plan, plan_pagado ni trial_ends_at de su finca por la API, ni
--     crear una finca con esos campos puestos. Antes la política fincas_update
--     dejaba al dueño hacer `update fincas set plan_pagado = true` con su
--     propia sesión y quedar en Hacienda sin pagar. Siguen pudiendo cambiar
--     nombre, zona horaria, etc. Las funciones security definer (crear_finca,
--     iniciar_prueba_ganadero), el SQL del panel de Supabase y las Edge
--     Functions (service_role) no pasan por este bloqueo.
--  2. iniciar_prueba_ganadero(finca): el dueño de una finca en el plan gratis
--     activa 15 días del plan Ganadero, una sola vez por finca. "Ya usó la
--     prueba" = trial_ends_at no es null (también cuenta la prueba vieja de 30
--     días). Al vencer, plan_efectivo() vuelve solo a 'ranchero': los animales
--     que ya registró se quedan, pero no puede agregar más hasta pagar.
--
--  Idempotente.
-- ============================================================================

create or replace function proteger_plan_finca() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.plan <> 'ranchero' or new.plan_pagado or new.trial_ends_at is not null then
      raise exception 'El plan de la finca no se puede escoger al crearla.'
        using errcode = 'P0001';
    end if;
  elsif new.plan is distinct from old.plan
     or new.plan_pagado is distinct from old.plan_pagado
     or new.trial_ends_at is distinct from old.trial_ends_at then
    raise exception 'El plan de la finca solo se cambia al confirmar el pago.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists trg_proteger_plan_finca on fincas;
create trigger trg_proteger_plan_finca
  before insert or update on fincas
  for each row execute function proteger_plan_finca();

create or replace function iniciar_prueba_ganadero(p_finca_id uuid) returns fincas
language plpgsql security definer set search_path = public as $$
declare
  f fincas;
begin
  select * into f from fincas where id = p_finca_id for update;
  if not found or f.owner_user_id is distinct from auth.uid() then
    raise exception 'Solo el dueño de la finca puede activar la prueba.'
      using errcode = 'P0001';
  end if;
  if f.plan_pagado then
    raise exception 'Esta finca ya tiene un plan pago.'
      using errcode = 'P0001';
  end if;
  if f.trial_ends_at is not null then
    raise exception 'Esta finca ya usó su prueba gratis.'
      using errcode = 'P0001';
  end if;

  update fincas
     set plan = 'ganadero',
         trial_ends_at = now() + interval '15 days'
   where id = p_finca_id
  returning * into f;
  return f;
end $$;

revoke all on function iniciar_prueba_ganadero(uuid) from public, anon;
grant execute on function iniciar_prueba_ganadero(uuid) to authenticated;
