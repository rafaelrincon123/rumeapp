-- ============================================================================
--  RumeApp — Pagos en línea con Bold (botón de pagos)
--
--  1. fincas.plan_pagado_hasta: hasta cuándo dura lo que se pagó (1 mes o
--     1 año). null = pago manual de antes, sin vencimiento (como hasta hoy).
--     plan_efectivo() deja de contar el plan pagado cuando se vence.
--  2. pagos_bold: un registro por intento de pago (order-id de Bold). Lo crea
--     la Edge Function bold-pago con la service_role; el dueño solo lo lee.
--  3. activar_pago_bold(): marca el pago aprobado y activa el plan. Solo la
--     llaman las Edge Functions (bold-webhook y bold-pago al verificar). Es
--     idempotente: Bold reintenta el webhook y también se verifica al volver.
--  4. proteger_plan_finca también protege plan_pagado_hasta.
--
--  Idempotente.
-- ============================================================================

alter table fincas add column if not exists plan_pagado_hasta timestamptz;

create or replace function plan_efectivo(p_finca_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when f.plan_pagado and (f.plan_pagado_hasta is null or f.plan_pagado_hasta > now()) then f.plan
    when f.trial_ends_at is not null and f.trial_ends_at > now() then f.plan
    else 'ranchero'
  end
  from fincas f
  where f.id = p_finca_id
$$;

create or replace function proteger_plan_finca() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.plan <> 'ranchero' or new.plan_pagado or new.trial_ends_at is not null
       or new.plan_pagado_hasta is not null then
      raise exception 'El plan de la finca no se puede escoger al crearla.'
        using errcode = 'P0001';
    end if;
  elsif new.plan is distinct from old.plan
     or new.plan_pagado is distinct from old.plan_pagado
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.plan_pagado_hasta is distinct from old.plan_pagado_hasta then
    raise exception 'El plan de la finca solo se cambia al confirmar el pago.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

create table if not exists pagos_bold (
  order_id        text primary key,
  finca_id        uuid not null references fincas(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  plan            text not null check (plan in ('ganadero', 'hacienda')),
  periodo         text not null check (periodo in ('mensual', 'anual')),
  monto           int  not null,
  estado          text not null default 'pendiente'
                  check (estado in ('pendiente', 'aprobado', 'rechazado', 'revisar')),
  bold_payment_id text,
  metodo          text,
  created_at      timestamptz not null default now(),
  aprobado_at     timestamptz
);

create index if not exists idx_pagos_bold_finca on pagos_bold(finca_id);

alter table pagos_bold enable row level security;

drop policy if exists "pagos_bold_select" on pagos_bold;
create policy "pagos_bold_select" on pagos_bold
  for select to authenticated
  using (exists (select 1 from fincas f where f.id = finca_id and f.owner_user_id = auth.uid()));

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
         plan_pagado_hasta = base + case when p.periodo = 'anual' then interval '1 year' else interval '1 month' end
   where id = p.finca_id;

  update pagos_bold
     set estado = 'aprobado', bold_payment_id = p_payment_id, metodo = p_metodo, aprobado_at = now()
   where order_id = p_order_id
  returning * into p;
  return p;
end $$;

revoke all on function activar_pago_bold(text, text, int, text) from public, anon, authenticated;
grant execute on function activar_pago_bold(text, text, int, text) to service_role;
