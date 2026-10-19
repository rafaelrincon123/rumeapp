-- Cerdos, aves y lotes (2026-10-20).
--
-- 1) animales.especie acepta 'porcino': las cerdas, verracos y lechones de
--    cría se llevan uno por uno, como el resto del hato.
-- 2) partos.nacidos_vivos / nacidos_muertos: camadas (cerdas, cabras, ovejas).
-- 3) lotes + registros_lote: aves (ponedoras, engorde, de campo) y cerdos de
--    levante/ceba se manejan por grupo, no animal por animal. Cada registro
--    del lote es un dato del día: huevos, mortalidad, alimento, peso
--    promedio, venta u otro.
--
-- Mismos permisos que el resto de tablas de la finca (ver
-- 2026-09-22-roles-y-permisos.sql): cualquier miembro lee, owner/admin/
-- operario escriben, owner/admin borran. finca_id se pone solo si no viene.

-- 1) Especie porcino ----------------------------------------------------------
alter table public.animales drop constraint if exists animales_especie_check;
alter table public.animales
  add constraint animales_especie_check
  check (especie in ('bovino', 'bufalino', 'caprino', 'ovino', 'equino', 'porcino'));

-- 2) Camadas -------------------------------------------------------------------
alter table public.partos
  add column if not exists nacidos_vivos int check (nacidos_vivos is null or nacidos_vivos >= 0),
  add column if not exists nacidos_muertos int check (nacidos_muertos is null or nacidos_muertos >= 0);

-- 3) Lotes ---------------------------------------------------------------------
create table if not exists public.lotes (
  id text primary key,
  finca_id uuid not null references public.fincas(id) on delete cascade,
  especie text not null check (especie in ('aviar', 'porcino')),
  sistema text not null check (sistema in ('ponedoras', 'engorde', 'campo', 'levante_ceba')),
  nombre text not null,
  fecha_ingreso date not null,
  cantidad_inicial int not null check (cantidad_inicial > 0),
  edad_ingreso_dias int not null default 0 check (edad_ingreso_dias >= 0),
  raza text,
  ubicacion text,
  peso_ingreso_kg numeric check (peso_ingreso_kg is null or peso_ingreso_kg >= 0),
  estado text not null default 'activo' check (estado in ('activo', 'cerrado')),
  fecha_cierre date,
  notas text,
  created_at timestamptz not null default now()
);

create table if not exists public.registros_lote (
  id text primary key,
  finca_id uuid not null references public.fincas(id) on delete cascade,
  lote_id text not null references public.lotes(id) on delete cascade,
  fecha date not null,
  tipo text not null check (tipo in ('huevos', 'mortalidad', 'alimento', 'peso', 'venta', 'venta_huevos', 'otro')),
  cantidad numeric not null default 0 check (cantidad >= 0),
  -- venta: animales vendidos (bajan del lote) y plata en valor;
  -- venta_huevos: huevos vendidos y plata; alimento: kg y costo.
  valor numeric check (valor is null or valor >= 0),
  notas text,
  created_at timestamptz not null default now()
);

create index if not exists lotes_finca_idx on public.lotes (finca_id);
create index if not exists registros_lote_lote_idx on public.registros_lote (lote_id, fecha);
create index if not exists registros_lote_finca_idx on public.registros_lote (finca_id);

alter table public.lotes enable row level security;
alter table public.registros_lote enable row level security;

do $$
declare t text;
begin
  foreach t in array array['lotes', 'registros_lote'] loop
    execute format('drop trigger if exists trg_%s_finca_id on %I', t, t);
    execute format(
      'create trigger trg_%s_finca_id before insert on %I '
      'for each row execute function set_default_finca_id()', t, t);

    execute format('drop policy if exists "tenant_select_%s" on %I', t, t);
    execute format('drop policy if exists "tenant_write_%s" on %I', t, t);
    execute format('drop policy if exists "tenant_update_%s" on %I', t, t);
    execute format('drop policy if exists "tenant_delete_%s" on %I', t, t);
    execute format(
      'create policy "tenant_select_%s" on %I for select to authenticated '
      'using (is_finca_member(finca_id))', t, t);
    execute format(
      'create policy "tenant_write_%s" on %I for insert to authenticated '
      'with check (finca_role_puede_editar(finca_id))', t, t);
    execute format(
      'create policy "tenant_update_%s" on %I for update to authenticated '
      'using (finca_role_puede_editar(finca_id)) '
      'with check (finca_role_puede_editar(finca_id))', t, t);
    execute format(
      'create policy "tenant_delete_%s" on %I for delete to authenticated '
      'using (finca_role_puede_borrar(finca_id))', t, t);
  end loop;
end $$;

-- En vivo, como el resto de tablas.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'lotes') then
    alter publication supabase_realtime add table public.lotes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'registros_lote') then
    alter publication supabase_realtime add table public.registros_lote;
  end if;
end $$;
