-- 2026-11-05 · Plan Fundador: subir cupos a 100 y cambiarlo a plan Full
--
-- Cambios:
--   1. cupos_fundador(): el tope sube de 50 → 100 fincas. Devuelve cuántos
--      cupos QUEDAN (tope - pagos aprobados con periodo='fundador'); la UI y
--      bold-pago ocultan la oferta cuando llega a 0.
--
--   2. El plan de destino del Fundador cambia de 'ganadero' (Pro) a 'hacienda'
--      (Full). Eso lo asigna bold-pago al crear el registro en pagos_bold;
--      activar_pago_bold() lee pagos_bold.plan tal cual, así que no necesita
--      modificarse. Al cumplirse el año, el usuario renueva al precio Full
--      vigente (sin tarifa Fundador).
--
--   3. Se deja de usar FIN_FUNDADOR (la fecha límite). La oferta ahora solo
--      se cierra cuando se completan los 100 cupos.

create or replace function cupos_fundador() returns int
language sql stable security definer set search_path = public as $$
  select greatest(0, 100 - count(distinct finca_id))::int
    from pagos_bold
   where periodo = 'fundador' and estado = 'aprobado'
$$;

grant execute on function cupos_fundador() to anon, authenticated;
