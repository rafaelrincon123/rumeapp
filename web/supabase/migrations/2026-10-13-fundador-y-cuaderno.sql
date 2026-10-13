-- ============================================================================
--  RumeApp — Plan Fundador y lectura del cuaderno por foto
--
--  1. lecturas_cuaderno: cada vez que la Edge Function leer-cuaderno lee fotos
--     (para el tope diario por usuario y para ver el costo). Solo la usa la
--     service_role: RLS activa y sin políticas.
--  2. Plan Fundador: plan Ganadero por $150.000 el año, precio para siempre,
--     solo para las primeras 50 fincas que paguen.
--     - pagos_bold / comprobantes_pago aceptan periodo 'fundador' (1 año).
--     - fincas.fundador: queda marcado al aprobarse el pago; con eso la finca
--       puede renovar al mismo precio aunque ya no queden cupos.
--     - cupos_fundador(): cuántos cupos quedan (lo ve la landing sin sesión).
--     - activar_pago_bold: 'fundador' suma 1 año y marca la finca.
--     - proteger_plan_finca también protege fincas.fundador.
--
--  Idempotente.
-- ============================================================================

-- 1) Lecturas de fotos -------------------------------------------------------
create table if not exists lecturas_cuaderno (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  finca_id       uuid not null references fincas(id) on delete cascade,
  imagenes       int  not null,
  tokens_entrada int,
  tokens_salida  int,
  created_at     timestamptz not null default now()
);
create index if not exists idx_lecturas_cuaderno_user on lecturas_cuaderno(user_id, created_at);
alter table lecturas_cuaderno enable row level security;

-- 2) Plan Fundador -----------------------------------------------------------
alter table fincas add column if not exists fundador boolean not null default false;

alter table pagos_bold drop constraint if exists pagos_bold_periodo_check;
alter table pagos_bold add constraint pagos_bold_periodo_check
  check (periodo in ('mensual', 'anual', 'fundador'));

alter table comprobantes_pago drop constraint if exists comprobantes_pago_periodo_check;
alter table comprobantes_pago add constraint comprobantes_pago_periodo_check
  check (periodo in ('mensual', 'anual', 'fundador'));

create or replace function cupos_fundador() returns int
language sql stable security definer set search_path = public as $$
  select greatest(0, 50 - count(distinct finca_id))::int
    from pagos_bold
   where periodo = 'fundador' and estado = 'aprobado'
$$;
grant execute on function cupos_fundador() to anon, authenticated;

create or replace function proteger_plan_finca() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.plan <> 'ranchero' or new.plan_pagado or new.trial_ends_at is not null
       or new.plan_pagado_hasta is not null or new.fundador then
      raise exception 'El plan de la finca no se puede escoger al crearla.'
        using errcode = 'P0001';
    end if;
  elsif new.plan is distinct from old.plan
     or new.plan_pagado is distinct from old.plan_pagado
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.plan_pagado_hasta is distinct from old.plan_pagado_hasta
     or new.fundador is distinct from old.fundador then
    raise exception 'El plan de la finca solo se cambia al confirmar el pago.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function activar_pago_bold(
  p_order_id   text,
  p_payment_id text,
  p_total      int,
  p_metodo     text default null
) returns pagos_bold
language plpgsql security definer set search_path = public as $$
declare
  p pagos_bold;
  f fincas;
  base timestamptz;
begin
  select * into p from pagos_bold where order_id = p_order_id for update;
  if not found then
    raise exception 'Pago % no existe', p_order_id;
  end if;
  if p.estado = 'aprobado' then
    return p; -- ya procesado (reintento del webhook o doble verificación)
  end if;
  if p_total is distinct from p.monto then
    update pagos_bold set estado = 'revisar', bold_payment_id = p_payment_id, metodo = p_metodo
     where order_id = p_order_id returning * into p;
    return p; -- monto distinto al cobrado: no se activa, queda para revisar a mano
  end if;
  select * into f from fincas where id = p.finca_id for update;
  -- Si ya tenía este mismo plan pagado y vigente, se suma al tiempo que le queda.
  base := case
    when f.plan = p.plan and f.plan_pagado and f.plan_pagado_hasta > now() then f.plan_pagado_hasta
    else now()
  end;
  update fincas
     set plan = p.plan,
         plan_pagado = true,
         plan_pagado_hasta = base + case when p.periodo in ('anual', 'fundador') then interval '1 year' else interval '1 month' end,
         fundador = fundador or p.periodo = 'fundador'
   where id = p.finca_id;
  update pagos_bold
     set estado = 'aprobado', bold_payment_id = p_payment_id, metodo = p_metodo, aprobado_at = now()
   where order_id = p_order_id
  returning * into p;
  return p;
end $$;
revoke all on function activar_pago_bold(text, text, int, text) from public, anon, authenticated;
grant execute on function activar_pago_bold(text, text, int, text) to service_role;
