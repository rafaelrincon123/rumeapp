-- Límite de lotes por plan (2026-10-20, decisión de Rafael).
--
-- Ranchero (gratis): 1 lote activo. Ganadero y Hacienda: ilimitados.
-- Cuenta solo los lotes ACTIVOS: cerrar un lote libera el cupo. Se revisa
-- al crear un lote y al volver a abrir uno cerrado. Usa plan_efectivo, así
-- que una finca en prueba de Ganadero tiene lotes ilimitados mientras dure.
-- Espejo en web/src/lib/plans.ts (PLAN_LIMITS.*.maxLotes).

create or replace function public.plan_max_lotes(p_finca_id uuid) returns int
language sql stable security definer set search_path = public as $$
  select case plan_efectivo(p_finca_id) when 'ranchero' then 1 else null end
$$;

create or replace function public.enforce_lotes_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cap int;
  activos int;
begin
  if new.estado <> 'activo' or new.finca_id is null then
    return new;
  end if;
  -- Al editar un lote que ya estaba activo no se cuenta de nuevo.
  if tg_op = 'UPDATE' and old.estado = 'activo' then
    return new;
  end if;

  cap := plan_max_lotes(new.finca_id);
  if cap is null then
    return new;
  end if;

  select count(*) into activos
    from lotes
   where finca_id = new.finca_id and estado = 'activo' and id <> new.id;
  if activos >= cap then
    raise exception 'El plan gratis permite % lote activo. Cierre el que tiene o cambie de plan para manejar más.', cap
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists trg_lotes_limite on public.lotes;
create trigger trg_lotes_limite
  before insert or update of estado on public.lotes
  for each row execute function public.enforce_lotes_limit();

grant execute on function public.plan_max_lotes(uuid) to authenticated;
