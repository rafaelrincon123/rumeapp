-- ============================================================================
--  RumeApp — Sistema de referidos
--
--  Cada usuario tiene un código único (6 letras, sin caracteres confusos) que
--  forma su link: https://rumea.app/?r=XXXXXX. Cuando un usuario "referido"
--  paga por primera vez y el referidor está en plan pagado vigente, el
--  referidor gana +30 días en su plan_pagado_hasta. Reglas:
--
--    1. Solo cuenta el PRIMER pago del referido (una fila por (referido_id)).
--    2. El referidor debe tener plan_pagado=true y plan_pagado_hasta > now()
--       al momento del pago. Si está en Gratuito, pierde la oportunidad.
--    3. No gana si se refiere a sí mismo (chequeo en la función).
--
--  Cambios:
--    - user_profiles.codigo_referido (text unique) con generación automática.
--    - user_profiles.referido_por (uuid, null, references auth.users).
--    - Tabla creditos_referido: registro inmutable de cada crédito otorgado.
--    - RPC resolver_codigo_referido(codigo): el signup resuelve antes de pedir.
--    - Función otorgar_credito_referido(order_id): la llama pago-aprobado
--      después de activar_pago_bold; idempotente por (referido_user_id).
--    - crear_finca extendida para aceptar p_codigo_referido.
--
--  Idempotente. Se corre desde el SQL Editor o supabase db query --linked.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Columnas en user_profiles
-- ---------------------------------------------------------------------------

alter table user_profiles add column if not exists codigo_referido text;
alter table user_profiles add column if not exists referido_por uuid references auth.users(id) on delete set null;

-- Generador de código: 6 caracteres de un alfabeto sin caracteres confusos
-- (sin 0/O, 1/I/L, para que la gente lo pueda escribir a mano por teléfono).
create or replace function generar_codigo_referido() returns text
language plpgsql set search_path = public as $$
declare
  alfabeto text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  codigo   text;
  i        int;
begin
  for intento in 1..10 loop
    codigo := '';
    for i in 1..6 loop
      codigo := codigo || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    if not exists (select 1 from user_profiles where codigo_referido = codigo) then
      return codigo;
    end if;
  end loop;
  -- Si en 10 intentos no se encontró uno libre (improbable: 31^6 ≈ 887M), falla.
  raise exception 'No se pudo generar un código de referido único';
end $$;

-- Asigna código a los perfiles existentes que no tengan uno.
update user_profiles set codigo_referido = generar_codigo_referido()
 where codigo_referido is null;

alter table user_profiles alter column codigo_referido set not null;

create unique index if not exists idx_user_profiles_codigo_referido
  on user_profiles(codigo_referido);

create index if not exists idx_user_profiles_referido_por
  on user_profiles(referido_por);

-- ---------------------------------------------------------------------------
-- 2. Tabla creditos_referido: una fila por cada crédito otorgado
-- ---------------------------------------------------------------------------

create table if not exists creditos_referido (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  referido_user_id    uuid not null references auth.users(id) on delete cascade,
  pago_order_id       text not null,
  plan                text not null,       -- plan que pagó el referido
  periodo             text not null,       -- 'mensual' | 'anual' | 'fundador'
  dias                int  not null,       -- 30 por diseño actual
  nuevo_plan_hasta    timestamptz not null, -- nueva fecha de plan_pagado_hasta
  created_at          timestamptz not null default now(),
  -- Un referido solo genera un crédito en toda su vida (primer pago).
  unique (referido_user_id)
);

create index if not exists idx_creditos_referido_user
  on creditos_referido(user_id, created_at desc);

alter table creditos_referido enable row level security;

drop policy if exists "Ver los míos" on creditos_referido;
create policy "Ver los míos" on creditos_referido
  for select using (user_id = auth.uid());

-- Insertar y modificar: solo service_role (vía la función otorgar_credito_referido).

-- ---------------------------------------------------------------------------
-- 3. Resolver un código → user_id (lo usa el signup)
-- ---------------------------------------------------------------------------

create or replace function resolver_codigo_referido(p_codigo text)
  returns uuid
  language sql stable security definer set search_path = public as $$
  select user_id from user_profiles
   where codigo_referido = upper(nullif(trim(p_codigo), ''))
   limit 1
$$;

grant execute on function resolver_codigo_referido(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Otorgar crédito al aprobarse un pago
-- ---------------------------------------------------------------------------

-- Devuelve el user_id del referidor que recibió el crédito (null si no aplicó).
-- Reglas:
--   - El pago debe estar aprobado.
--   - El referido tiene user_profiles.referido_por != null y no se refiere a sí mismo.
--   - No hay ya un crédito para este referido (primer pago).
--   - El referidor tiene plan_pagado=true y plan_pagado_hasta > now() en ALGUNA de sus
--     fincas (la que tenga la fecha más lejana; se extiende ESA).
create or replace function otorgar_credito_referido(p_order_id text)
  returns uuid
  language plpgsql security definer set search_path = public as $$
declare
  v_pago           pagos_bold;
  v_referido_user  uuid;
  v_referidor      uuid;
  v_finca_elegida  uuid;
  v_hasta_actual   timestamptz;
  v_hasta_nuevo    timestamptz;
  v_dias           constant int := 30;
begin
  select * into v_pago from pagos_bold where order_id = p_order_id;
  if not found or v_pago.estado <> 'aprobado' then
    return null;
  end if;

  v_referido_user := v_pago.user_id;

  -- ¿Tiene referidor?
  select referido_por into v_referidor
    from user_profiles where user_id = v_referido_user;
  if v_referidor is null or v_referidor = v_referido_user then
    return null;
  end if;

  -- ¿Ya le otorgamos crédito antes a este referido?
  if exists (select 1 from creditos_referido where referido_user_id = v_referido_user) then
    return null;
  end if;

  -- ¿El referidor tiene plan pagado vigente en alguna de sus fincas?
  -- Se elige la finca con la fecha más lejana para extenderla.
  select id, plan_pagado_hasta
    into v_finca_elegida, v_hasta_actual
    from fincas
   where owner_user_id = v_referidor
     and plan_pagado = true
     and plan_pagado_hasta is not null
     and plan_pagado_hasta > now()
   order by plan_pagado_hasta desc
   limit 1;

  if v_finca_elegida is null then
    return null;
  end if;

  v_hasta_nuevo := v_hasta_actual + make_interval(days => v_dias);

  -- Extender el plan. proteger_plan_finca solo bloquea cambios cuando
  -- current_user in ('authenticated','anon'); las funciones security definer
  -- corren como postgres y el trigger las deja pasar.
  update fincas set plan_pagado_hasta = v_hasta_nuevo where id = v_finca_elegida;

  insert into creditos_referido (
    user_id, referido_user_id, pago_order_id, plan, periodo, dias, nuevo_plan_hasta
  ) values (
    v_referidor, v_referido_user, p_order_id, v_pago.plan, v_pago.periodo, v_dias, v_hasta_nuevo
  );

  return v_referidor;
end $$;

revoke all on function otorgar_credito_referido(text) from public, anon, authenticated;
grant execute on function otorgar_credito_referido(text) to service_role;

-- ---------------------------------------------------------------------------
-- 5. crear_finca acepta p_codigo_referido
--
-- Se agrega el parámetro al final para no romper llamadas existentes. Si
-- viene un código, se resuelve y se guarda en user_profiles.referido_por
-- (solo al crear el perfil; si el usuario ya tenía referido_por, no se
-- sobrescribe para evitar cambios sospechosos después del signup).
-- ---------------------------------------------------------------------------

-- Firma vieja → se reemplaza por una con el parámetro nuevo opcional. Hay
-- dos versiones viejas registradas en la BD (la original de 3 params y la
-- extendida de 9 params); se dropean todas antes de crear la nueva.
drop function if exists crear_finca(text, text, text, int, text, text, text, text, text);
drop function if exists crear_finca(text, text, text, int, text, text, text, text);
drop function if exists crear_finca(text, text, text);

create or replace function crear_finca(
  p_nombre              text,
  p_timezone            text default 'America/Bogota',
  p_nombre_propietario  text default null,
  p_tamano_aprox        int  default null,
  p_telefono            text default null,
  p_departamento        text default null,
  p_ciudad              text default null,
  p_referido_via        text default null,
  p_plan_elegido        text default 'ranchero',
  p_codigo_referido     text default null
) returns fincas
language plpgsql security definer set search_path = public as $$
declare
  uid_actual     uuid := auth.uid();
  email_actual   text;
  nombre_final   text;
  nueva          fincas;
  prop_id        text := 'p-' || replace(gen_random_uuid()::text, '-', '');
  plan_valido    text;
  v_referido_por uuid;
begin
  if uid_actual is null then
    raise exception 'No hay usuario autenticado';
  end if;

  select email into email_actual from auth.users where id = uid_actual;
  nombre_final := coalesce(nullif(trim(p_nombre_propietario), ''), split_part(email_actual, '@', 1));

  plan_valido := case
    when p_plan_elegido in ('ranchero', 'ganadero', 'hacienda') then p_plan_elegido
    else 'ranchero'
  end;

  -- Resolver código de referido (si vino alguno). Nunca self-referral.
  if p_codigo_referido is not null and length(trim(p_codigo_referido)) > 0 then
    select user_id into v_referido_por
      from user_profiles
     where codigo_referido = upper(trim(p_codigo_referido))
     limit 1;
    if v_referido_por = uid_actual then
      v_referido_por := null;
    end if;
  end if;

  -- Upsert perfil: si es el primer finca, se crea el perfil con código y
  -- referido_por. En los siguientes crear_finca no se toca referido_por
  -- (solo se asigna una vez).
  insert into user_profiles (
    user_id, nombre, telefono, departamento, ciudad, referido_via,
    codigo_referido, referido_por
  )
  values (
    uid_actual, nombre_final,
    nullif(trim(p_telefono), ''),
    nullif(trim(p_departamento), ''),
    nullif(trim(p_ciudad), ''),
    nullif(trim(p_referido_via), ''),
    generar_codigo_referido(),
    v_referido_por
  )
  on conflict (user_id) do update
    set nombre       = coalesce(excluded.nombre,       user_profiles.nombre),
        telefono     = coalesce(excluded.telefono,     user_profiles.telefono),
        departamento = coalesce(excluded.departamento, user_profiles.departamento),
        ciudad       = coalesce(excluded.ciudad,       user_profiles.ciudad),
        referido_via = coalesce(excluded.referido_via, user_profiles.referido_via),
        -- referido_por solo se setea si estaba null (no se sobrescribe).
        referido_por = coalesce(user_profiles.referido_por, excluded.referido_por);

  insert into fincas (id, nombre, timezone, owner_user_id, plan, tamano_aprox)
  values (
    gen_random_uuid(), p_nombre,
    coalesce(nullif(trim(p_timezone), ''), 'America/Bogota'),
    uid_actual, plan_valido, p_tamano_aprox
  )
  returning * into nueva;

  insert into finca_miembros (finca_id, user_id, rol, estado)
  values (nueva.id, uid_actual, 'owner', 'activo');

  insert into propietarios (
    id, finca_id, nombre, email, telefono, porcentaje, auth_user_id, created_at, updated_at
  )
  values (
    prop_id, nueva.id, nombre_final, email_actual,
    nullif(trim(p_telefono), ''), 100, uid_actual, now(), now()
  );

  return nueva;
end $$;

grant execute on function crear_finca(text, text, text, int, text, text, text, text, text, text) to authenticated;
