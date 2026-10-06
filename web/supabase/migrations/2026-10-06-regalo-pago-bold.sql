-- ============================================================================
--  RumeApp — Envío automático de la guía de regalo al aprobarse un pago Bold
--
--  1. pagos_bold.regalo_enviado_at: se marca (de forma atómica) justo antes de
--     enviar los correos, para que el webhook de Bold y la verificación al
--     volver de la pasarela no los manden dos veces. Si el envío falla, la
--     Edge Function lo vuelve a dejar en null para reintentar.
--  2. Bucket privado "regalos" en Storage, con la guía en PDF
--     (Guia-practica-ganaderia-RumeApp.pdf). Sin políticas: solo lo leen las
--     Edge Functions con la service_role; el cliente la recibe adjunta.
--
--  Idempotente.
-- ============================================================================

alter table pagos_bold add column if not exists regalo_enviado_at timestamptz;

insert into storage.buckets (id, name, public)
values ('regalos', 'regalos', false)
on conflict (id) do nothing;
