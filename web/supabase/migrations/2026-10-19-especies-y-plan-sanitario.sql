-- Especies y plan sanitario automático (2026-10-19).
--
-- 1) animales.especie: RumeApp deja de ser solo de ganado bovino. Las
--    categorías siguen siendo las mismas 6 (cría macho/hembra, joven
--    macho/hembra, adulto macho/hembra); la app las nombra según la especie
--    (vaca/búfala/cabra/oveja/yegua…). Los animales que ya existen quedan
--    como 'bovino'.
-- 2) tareas.origen: las actividades que crea el plan sanitario llevan
--    'plan:<especie>:<item>'. Al marcarlas hechas la app programa la
--    siguiente. Las actividades manuales lo dejan en null.

alter table public.animales
  add column if not exists especie text not null default 'bovino';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'animales_especie_check'
  ) then
    alter table public.animales
      add constraint animales_especie_check
      check (especie in ('bovino', 'bufalino', 'caprino', 'ovino', 'equino'));
  end if;
end $$;

alter table public.tareas
  add column if not exists origen text;

create index if not exists tareas_origen_idx
  on public.tareas (finca_id, origen)
  where origen is not null;
