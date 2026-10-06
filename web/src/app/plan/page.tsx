"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDB } from "@/lib/useDB";
import { emitFincaChanged, useFincaActiva } from "@/lib/useFincaActiva";
import { crearPagoBold, pintarBotonBold, verificarPagoBold, type EstadoPagoBold } from "@/lib/bold";
import { fmtDate } from "@/lib/format";
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
  MESES_DESCUENTO_INICIAL,
} from "@/lib/plans";
import { getSupabase } from "@/lib/supabase";
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

  // De vuelta de Bold: /plan?bold-order-id=…&bold-tx-status=… → se verifica
  // el pago en el servidor (no se confía en el estado que trae la URL).
  const [regresoBold, setRegresoBold] = useState<{ orderId: string; estado: EstadoPagoBold | "verificando" | "error"; error?: string } | null>(null);
  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get("bold-order-id");
    if (!orderId) return;
    window.history.replaceState(null, "", "/plan");
    setRegresoBold({ orderId, estado: "verificando" });
    let intentos = 0;
    const verificar = () => {
      verificarPagoBold(orderId)
        .then((r) => {
          // PSE y algunos pagos tardan en confirmarse: se reintenta un rato.
          if (r.estado === "pendiente" && intentos++ < 6) {
            setTimeout(verificar, 5000);
            return;
          }
          setRegresoBold({ orderId, estado: r.estado });
          if (r.estado === "aprobado") emitFincaChanged();
        })
        .catch((e: Error) => setRegresoBold({ orderId, estado: "error", error: e.message }));
    };
    verificar();
  }, []);

  // Descuento de bienvenida: 20 % en los primeros pagos mensuales. Se cuentan
  // los pagos mensuales aprobados por Bold (bold-pago aplica la misma regla).
  const [mesesDescuento, setMesesDescuento] = useState(MESES_DESCUENTO_INICIAL);
  useEffect(() => {
    if (!activa) return;
    void getSupabase()
      .from("pagos_bold")
      .select("order_id", { count: "exact", head: true })
      .eq("finca_id", activa.id)
      .eq("estado", "aprobado")
      .eq("periodo", "mensual")
      .then(({ count }) => setMesesDescuento(Math.max(0, MESES_DESCUENTO_INICIAL - (count ?? 0))));
  }, [activa]);

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
      {activa.planPagado && activa.planPagadoHasta && (
        <div
          className="rounded-2xl px-4 py-3 text-sm"
          style={{ background: "rgba(184, 206, 122, 0.2)", border: "1px solid rgba(20,38,26,0.15)" }}
        >
          {new Date(activa.planPagadoHasta) > new Date() ? (
            <>
              Su plan <strong>{planLabel(activa.plan)}</strong> está pagado hasta el{" "}
              <strong>{fmtDate(activa.planPagadoHasta)}</strong>. Para seguir sin interrupciones,
              renuévelo antes de esa fecha.
            </>
          ) : (
            <>
              Su plan <strong>{planLabel(activa.plan)}</strong> venció el{" "}
              {fmtDate(activa.planPagadoHasta)}. Ahora está en el plan Ranchero: renuévelo abajo.
            </>
          )}
        </div>
      )}

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
        descuentoInicial={mesesDescuento > 0}
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
        Pago en línea seguro con Bold (tarjeta, PSE, Nequi o Bancolombia): el plan se activa
        apenas se aprueba. También puede transferir y subir el comprobante.
      </p>

      {regresoBold && (
        <RegresoBoldModal
          estado={regresoBold.estado}
          error={regresoBold.error}
          hasta={activa.planPagadoHasta}
          plan={activa.plan}
          onClose={() => setRegresoBold(null)}
        />
      )}

      {pagando && (
        <PagoManualModal
          destino={pagando.plan}
          periodo={pagando.periodo}
          mesesDescuento={mesesDescuento}
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
  mesesDescuento,
  fincaId,
  onClose,
}: {
  destino: PlanFinca;
  periodo: Periodo;
  /** Pagos mensuales que le quedan con el 20 % de bienvenida. */
  mesesDescuento: number;
  fincaId: string;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  // Pago en línea: al tocar "Pagar en línea" se pide la firma al servidor y
  // se pinta el botón de Bold en `botonRef`. La transferencia queda abajo.
  const [boldEstado, setBoldEstado] = useState<"inicio" | "cargando" | "listo" | "error">("inicio");
  const [boldError, setBoldError] = useState<string | null>(null);
  const [verManual, setVerManual] = useState(false);
  const botonRef = useRef<HTMLDivElement>(null);
  const conDescuento = periodo === "mensual" && mesesDescuento > 0;
  const valor = precioPeriodo(destino, periodo, conDescuento);

  async function prepararBold() {
    if (destino !== "ganadero" && destino !== "hacienda") return;
    setBoldEstado("cargando");
    setBoldError(null);
    try {
      const datos = await crearPagoBold(fincaId, destino, periodo);
      setBoldEstado("listo");
      // El contenedor ya está en pantalla; se pinta en el siguiente cuadro.
      requestAnimationFrame(() => {
        if (botonRef.current) pintarBotonBold(botonRef.current, datos);
      });
    } catch (e) {
      setBoldError((e as Error).message);
      setBoldEstado("error");
    }
  }

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
            🎓 Con la activación le enviamos a su correo la <strong>{CURSO_REGALO}</strong> de regalo.
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
      eyebrow="Pago"
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm rounded-xl px-3 py-2" style={{ background: "rgba(184, 206, 122, 0.22)" }}>
          🎓 De regalo: al confirmar su pago le enviamos la <strong>{CURSO_REGALO}</strong> (55 páginas en PDF).
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
              {periodo === "anual" ? "Valor del plan por el año" : "Valor del plan por mes"}
            </div>
            <div className="text-2xl font-bold mt-0.5">{cop(valor)} COP</div>
            {conDescuento && (
              <div className="text-xs opacity-75">
                Con el 20 % de bienvenida ({mesesDescuento === 1 ? "su último mes" : `le quedan ${mesesDescuento} meses`} con descuento). Luego {cop(PLAN_LIMITS[destino].precioCOP)} al mes.
              </div>
            )}
            {periodo === "anual" && (
              <div className="text-xs opacity-75">
                En vez de {cop(PLAN_LIMITS[destino].precioCOP * 12)} pagando mes a mes.
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-primary p-4 space-y-3">
          <div>
            <div className="font-semibold">Pagar en línea</div>
            <p className="text-sm text-muted mt-0.5">
              Con tarjeta, PSE, Nequi o Bancolombia. Su plan queda activo apenas se apruebe el pago.
            </p>
          </div>
          {boldEstado !== "listo" && (
            <button
              type="button"
              className="btn btn-primary w-full justify-center"
              onClick={() => void prepararBold()}
              disabled={boldEstado === "cargando"}
            >
              {boldEstado === "cargando" ? "Preparando el pago…" : `Pagar ${cop(valor)} en línea`}
            </button>
          )}
          <div ref={botonRef} className={boldEstado === "listo" ? "flex justify-center min-h-12" : "hidden"} />
          {boldEstado === "listo" && (
            <p className="text-xs text-muted text-center">Toque el botón de Bold para abrir el pago seguro.</p>
          )}
          {boldError && <div className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">{boldError}</div>}
        </div>

        <button
          type="button"
          className="text-sm text-muted underline underline-offset-4 w-full text-center"
          onClick={() => setVerManual((v) => !v)}
        >
          {verManual ? "Ocultar la transferencia" : "Prefiero transferir y subir el comprobante"}
        </button>

        {verManual && (
        <>
        <p className="text-sm text-muted">
          Transfiere el valor del plan y sube tu comprobante. Te confirmamos y activamos tu
          plan en cuanto revisemos el pago.
        </p>
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
        </>
        )}
      </div>
    </Modal>
  );
}

function RegresoBoldModal({
  estado,
  error,
  hasta,
  plan,
  onClose,
}: {
  estado: EstadoPagoBold | "verificando" | "error";
  error?: string;
  hasta: string | null;
  plan: PlanFinca;
  onClose: () => void;
}) {
  const textos: Record<typeof estado, { titulo: string; cuerpo: React.ReactNode }> = {
    verificando: { titulo: "Revisando su pago…", cuerpo: "Un momento: estamos confirmando el pago con Bold." },
    aprobado: {
      titulo: "¡Pago aprobado!",
      cuerpo: (
        <>
          Su plan <strong>{planLabel(plan)}</strong> ya está activo
          {hasta ? <> hasta el <strong>{fmtDate(hasta)}</strong></> : null}. Le enviaremos a su correo
          la <strong>{CURSO_REGALO}</strong> de regalo.
        </>
      ),
    },
    pendiente: {
      titulo: "Su pago está en proceso",
      cuerpo: "Bold todavía no lo confirma (con PSE puede tardar unos minutos). Apenas se apruebe, su plan se activa solo.",
    },
    rechazado: {
      titulo: "El pago no se aprobó",
      cuerpo: "No se hizo ningún cobro. Puede intentarlo de nuevo con otro medio de pago o transferir y subir el comprobante.",
    },
    revisar: {
      titulo: "Estamos revisando su pago",
      cuerpo: "Recibimos el pago pero hay que revisarlo a mano. Le escribimos pronto; si tiene dudas, escríbanos a soporte@rumea.app.",
    },
    error: {
      titulo: "No pudimos revisar el pago",
      cuerpo: `${error ?? "Error desconocido"}. Si Bold le cobró, su plan se activará solo en unos minutos; si no, escríbanos a soporte@rumea.app.`,
    },
  };
  const t = textos[estado];
  return (
    <Modal open onClose={onClose} title={t.titulo} eyebrow="Pago en línea">
      <div className="space-y-4">
        <p className="text-sm">{t.cuerpo}</p>
        {estado !== "verificando" && (
          <button className="btn btn-primary w-full justify-center" onClick={onClose}>
            Entendido
          </button>
        )}
      </div>
    </Modal>
  );
}
