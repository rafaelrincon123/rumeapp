"use client";

import { useEffect, useMemo, useState } from "react";
import { useDB } from "@/lib/useDB";
import { useFincaActiva } from "@/lib/useFincaActiva";
import {
  PLAN_LIMITS,
  type Periodo,
  planLabel,
  planEfectivo,
  diasDePruebaRestantes,
  fmtPrecio,
  cop,
  precioPeriodo,
  CURSO_REGALO,
  puedeProbar,
} from "@/lib/plans";
import OfertaPrueba from "@/components/OfertaPrueba";
import { CUENTA_PAGO, registrarSolicitudPlan } from "@/lib/comprobantePago";
import type { PlanFinca } from "@/lib/types";
import Modal from "@/components/Modal";
import PricingCards from "@/components/PricingCards";

export default function PlanPage() {
  const { db, ready } = useDB();
  const { activa } = useFincaActiva();
  const [pagando, setPagando] = useState<{ plan: PlanFinca; periodo: Periodo } | null>(null);

  // Desde el registro: /plan?activar=ganadero abre directo el pago del plan elegido.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("activar");
    if (p === "ganadero" || p === "hacienda") {
      setPagando({ plan: p, periodo: "mensual" });
      window.history.replaceState(null, "", "/plan");
    }
  }, []);

  const usage = useMemo(() => {
    if (!db) return null;
    return {
      animales: db.animales.length,
      propietarios: db.propietarios.length,
    };
  }, [db]);

  if (!ready || !activa) return <div className="text-muted">Cargando…</div>;

  const planActual = planEfectivo(activa);
  const limits = PLAN_LIMITS[planActual];
  const diasPrueba = diasDePruebaRestantes(activa);
  const enPrueba = diasPrueba > 0 && activa.plan === planActual;
  const pruebaVencida = !activa.planPagado && !enPrueba && activa.plan !== "ranchero";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header>
        <h1 className="display-md tracking-tight font-serif">Tu plan</h1>
        <p className="text-sm text-muted mt-1">
          Elige el plan que se ajusta al tamaño de tu operación. Puedes cambiar cuando quieras.
        </p>
      </header>

      {enPrueba && (
        <div
          className="rounded-2xl px-4 py-3 text-sm"
          style={{ background: "rgba(184, 206, 122, 0.2)", border: "1px solid rgba(20,38,26,0.15)" }}
        >
          Estás probando el plan <strong>{planLabel(activa.plan)}</strong> gratis — quedan{" "}
          <strong>{diasPrueba} día{diasPrueba === 1 ? "" : "s"}</strong>. Cuando termine, tu finca
          vuelve al plan Ranchero salvo que la cambies a un plan pago.
        </div>
      )}
      {pruebaVencida && (
        <div
          className="rounded-2xl px-4 py-3 text-sm"
          style={{ background: "rgba(200, 60, 60, 0.10)", border: "1px solid rgba(200, 60, 60, 0.30)" }}
        >
          Tu prueba gratis terminó. Ahora estás en el plan <strong>Ranchero</strong>. Elige un
          plan abajo para seguir con más cupo.
        </div>
      )}
      {puedeProbar(activa) && <OfertaPrueba motivo="plan" />}

      {/* Estado actual */}
      <section
        className="rounded-2xl p-5 flex items-center gap-4 flex-wrap"
        style={{
          background: "var(--forest)",
          color: "white",
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="text-[0.68rem] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--lime-bright)" }}>
            Plan actual
          </div>
          <div className="text-2xl font-bold mt-1">{planLabel(planActual)}</div>
          {usage && (
            <div className="text-sm mt-2 opacity-80">
              Estás usando{" "}
              <strong>
                {usage.animales}
                {limits.maxAnimales !== null ? ` / ${limits.maxAnimales}` : ""}
              </strong>{" "}
              animales
              {limits.maxUsuarios !== null && (
                <>
                  {" y "}
                  <strong>
                    {usage.propietarios} / {limits.maxUsuarios}
                  </strong>{" "}
                  personas
                </>
              )}
              .
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-right" style={{ color: "var(--lime-bright)" }}>
          {fmtPrecio(planActual)}
        </div>
      </section>

      <PricingCards
        planActual={planActual}
        onSelect={(p, periodo) => {
          if (PLAN_LIMITS[p].precioCOP > 0) return setPagando({ plan: p, periodo });
          // Bajar al plan gratis no requiere pago: se pide por correo.
          const asunto = encodeURIComponent(`Cambiar a plan Ranchero — ${activa.nombre}`);
          const cuerpo = encodeURIComponent(
            `Hola,\n\nQuiero pasar mi finca "${activa.nombre}" (id: ${activa.id}) al plan Ranchero gratis.\n\nGracias.`
          );
          window.location.href = `mailto:soporte@rumea.app?subject=${asunto}&body=${cuerpo}`;
        }}
      />

      <p className="text-[0.7rem] text-subtle text-center">
        Los pagos automáticos llegarán próximamente. Por ahora los cambios se procesan
        manualmente: transfieres, subes el comprobante y activamos tu plan.
      </p>

      {pagando && (
        <PagoManualModal
          destino={pagando.plan}
          periodo={pagando.periodo}
          fincaId={activa.id}
          onClose={() => setPagando(null)}
        />
      )}
    </div>
  );
}

function PagoManualModal({
  destino,
  periodo,
  fincaId,
  onClose,
}: {
  destino: PlanFinca;
  periodo: Periodo;
  fincaId: string;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function handleEnviar() {
    setError(null);
    if (destino !== "ganadero" && destino !== "hacienda") return;
    setEnviando(true);
    try {
      await registrarSolicitudPlan({ fincaId, planSolicitado: destino, periodo, file });
      setEnviado(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <Modal open onClose={onClose} title="Solicitud enviada" eyebrow="Listo">
        <div className="space-y-4">
          <p className="text-sm">
            Recibimos tu solicitud para el plan <strong>{planLabel(destino)}</strong>{" "}
            ({periodo === "anual" ? "pago anual" : "pago mensual"})
            {file ? " con tu comprobante" : ""}. Te confirmamos por correo o WhatsApp en cuanto
            revisemos el pago, y tu plan queda activo.
          </p>
          <p className="text-sm">
            🎓 Con la activación le enviamos a su correo el <strong>{CURSO_REGALO}</strong> de regalo.
          </p>
          {!file && (
            <p className="text-xs text-muted">
              Si aún no has enviado el comprobante, mándalo a{" "}
              <a href="mailto:soporte@rumea.app" className="underline">
                soporte@rumea.app
              </a>
              .
            </p>
          )}
          <button className="btn btn-primary w-full justify-center" onClick={onClose}>
            Entendido
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Cambiar a ${planLabel(destino)}`}
      eyebrow="Pago manual"
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Transfiere el valor del plan y sube tu comprobante. Te confirmamos y activamos tu
          plan en cuanto revisemos el pago.
        </p>
        <p className="text-sm rounded-xl px-3 py-2" style={{ background: "rgba(184, 206, 122, 0.22)" }}>
          🎓 De regalo: al confirmar tu pago te enviamos el <strong>{CURSO_REGALO}</strong>.
        </p>

        {PLAN_LIMITS[destino].precioCOP > 0 && (
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--forest)", color: "var(--sand)" }}
          >
            <div
              className="text-[0.62rem] font-mono uppercase tracking-[0.14em]"
              style={{ color: "var(--lime-bright)" }}
            >
              {periodo === "anual" ? "Valor a transferir por el año" : "Valor a transferir por mes"}
            </div>
            <div className="text-2xl font-bold mt-0.5">{cop(precioPeriodo(destino, periodo))} COP</div>
            {periodo === "anual" && (
              <div className="text-xs opacity-75">
                En vez de {cop(PLAN_LIMITS[destino].precioCOP * 12)} pagando mes a mes.
              </div>
            )}
          </div>
        )}

        <div className="card bg-surface-2 space-y-2 text-sm">
          <div className="eyebrow">Cuenta bancaria</div>
          <div><strong>Banco:</strong> {CUENTA_PAGO.banco}</div>
          <div><strong>Tipo de cuenta:</strong> {CUENTA_PAGO.tipoCuenta}</div>
          <div><strong>Número:</strong> {CUENTA_PAGO.numeroCuenta}</div>
          <div><strong>Titular:</strong> {CUENTA_PAGO.titular}</div>
          <div className="pt-2 border-t border-rule">
            <strong>Nequi / Daviplata:</strong> {CUENTA_PAGO.nequi}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="eyebrow">Comprobante de pago (foto o PDF)</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <span className="text-[0.68rem] text-subtle">
            Opcional aquí — si prefieres, puedes mandarlo después a soporte@rumea.app.
          </span>
        </div>

        {error && (
          <div className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">{error}</div>
        )}

        <button
          className="btn btn-primary w-full justify-center"
          onClick={() => void handleEnviar()}
          disabled={enviando}
        >
          {enviando ? "Enviando…" : "Enviar solicitud"}
        </button>
      </div>
    </Modal>
  );
}
