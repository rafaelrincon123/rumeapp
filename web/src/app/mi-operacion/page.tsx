"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDB } from "@/lib/useDB";
import { useAuth } from "@/lib/useAuth";
import { fmtDate, fmtCOP, fmtNumber, fmtPct, edadTexto, diasHasta } from "@/lib/format";
import { CATEGORIAS_GASTO, TIPOS_SANIDAD } from "@/lib/types";
import { categoriaDe } from "@/lib/especies";
import { miParticipacion } from "@/lib/participacion";
import { participantesGasto, cuotasPorPropietario } from "@/lib/gastos";
import HeroStat from "@/components/HeroStat";
import Modal from "@/components/Modal";
import IngresoForm from "@/components/IngresoForm";
import Sparkline from "@/components/Sparkline";

export default function MiOperacionPage() {
  const { user } = useAuth();
  const { db, ready } = useDB();

  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");
  const [openIngreso, setOpenIngreso] = useState(false);

  const rango = useMemo(() => {
    const d = desde ? new Date(desde + "T00:00:00") : null;
    const h = hasta ? new Date(hasta + "T23:59:59") : null;
    const activo = !!(d || h);
    return { d, h, activo };
  }, [desde, hasta]);

  const data = useMemo(() => {
    if (!db || !user) return null;
    const myId = user.id;

    const misAnimales = db.animales.filter((a) => a.propietarioId === myId);
    const misAnimalesActivos = misAnimales.filter((a) => a.estado === "activo");
    const misAnimalIds = new Set(misAnimales.map((a) => a.id));

    const misGastos = db.gastos
      .filter((g) => {
        if (g.pagadoPor === myId) return true;
        return participantesGasto(g, db.animales).includes(myId);
      })
      .map((g) => {
        const cuotas = cuotasPorPropietario(g, db.animales);
        const miParte = cuotas[myId] ?? 0;
        const yoPague = g.pagadoPor === myId;
        // Mi valor efectivo: cuota si soy participante, monto completo si
        // solo puse la plata (aunque despues me reembolsen).
        const miValor = miParte > 0 ? miParte : g.monto;
        return { ...g, miParte, yoPague, miValor };
      });

    const misIngresos = db.ingresos.filter(
      (i) =>
        i.registradoPor === myId ||
        (i.animalId ? misAnimalIds.has(i.animalId) : false)
    );

    const misTareas = db.tareas.filter((t) => {
      const asignados = t.asignadoAIds && t.asignadoAIds.length > 0
        ? t.asignadoAIds
        : t.asignadoAId ? [t.asignadoAId] : [];
      if (asignados.includes(myId)) return true;
      const animales = t.animalIds && t.animalIds.length > 0
        ? t.animalIds
        : t.animalId ? [t.animalId] : [];
      return animales.some((id) => misAnimalIds.has(id));
    });

    const misSanidad = db.sanidad.filter((s) => misAnimalIds.has(s.animalId));

    const misServicios = db.servicios.filter((s) =>
      misAnimalIds.has(s.hembraId)
    );

    // Peso: por cada animal del usuario, ordena pesajes por fecha y calcula
    // peso actual + ganancia diaria (g/dia) entre el ultimo y el anterior.
    const misPesajesPorAnimal = misAnimales
      .map((a) => {
        const pesajes = db.pesajes
          .filter((p) => p.animalId === a.id)
          .sort(
            (x, y) => new Date(x.fecha).getTime() - new Date(y.fecha).getTime()
          );
        if (pesajes.length === 0) return null;
        const ultimo = pesajes[pesajes.length - 1];
        const anterior = pesajes.length >= 2 ? pesajes[pesajes.length - 2] : null;
        let gdp: number | null = null;
        if (anterior) {
          const dias =
            (new Date(ultimo.fecha).getTime() -
              new Date(anterior.fecha).getTime()) /
            (1000 * 60 * 60 * 24);
          if (dias > 0) gdp = ((ultimo.pesoKg - anterior.pesoKg) / dias) * 1000;
        }
        return {
          animal: a,
          pesajes,
          ultimo,
          anterior,
          gdp,
          values: pesajes.map((p) => p.pesoKg),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort(
        (a, b) =>
          new Date(b.ultimo.fecha).getTime() - new Date(a.ultimo.fecha).getTime()
      );

    const gastosTotales = misGastos.reduce((s, g) => s + g.miValor, 0);
    const ingresosTotales = misIngresos.reduce((s, i) => s + i.monto, 0);

    const inRange = (iso: string) => {
      if (!rango.activo) return true;
      const f = new Date(iso);
      if (rango.d && f < rango.d) return false;
      if (rango.h && f > rango.h) return false;
      return true;
    };

    const misGastosRango = misGastos.filter((g) => inRange(g.fecha));
    const misIngresosRango = misIngresos.filter((i) => inRange(i.fecha));
    const misSanidadRango = misSanidad.filter((s) => inRange(s.fecha));

    const gastosRango = misGastosRango.reduce((s, g) => s + g.miValor, 0);
    const ingresosRango = misIngresosRango.reduce((s, i) => s + i.monto, 0);

    const tareasPendientes = misTareas
      .filter((t) => !t.completada)
      .filter((t) => inRange(t.fecha))
      .map((t) => ({ ...t, dias: diasHasta(t.fecha) }))
      .sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999));

    const proximosPartos = misServicios
      .filter(
        (s) =>
          (s.resultado === "pendiente" || s.resultado === "prenada") &&
          s.fechaProbableParto
      )
      .filter((s) => inRange(s.fechaProbableParto!))
      .map((s) => ({ ...s, dias: diasHasta(s.fechaProbableParto) }))
      .filter((s) => rango.activo || (s.dias !== null && s.dias! >= -14 && s.dias! <= 300))
      .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0));

    const share = miParticipacion(myId, db.animales);

    return {
      misAnimales,
      misAnimalesActivos,
      misGastos,
      misGastosRango,
      misIngresos,
      misTareas,
      misSanidad,
      misSanidadRango,
      misServicios,
      misPesajesPorAnimal,
      gastosTotales,
      ingresosTotales,
      balanceTotal: ingresosTotales - gastosTotales,
      gastosRango,
      ingresosRango,
      balanceRango: ingresosRango - gastosRango,
      tareasPendientes,
      proximosPartos,
      participacionPct: share.pct,
    };
  }, [db, user, rango]);

  if (!ready || !user || !data) {
    return <div className="text-muted">Cargando…</div>;
  }

  const initials = user.nombre.slice(0, 2).toUpperCase();
  const hoyLabel = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Hero */}
      <section className="hero-card">
        <div className="flex items-center justify-between gap-2 mb-3 md:mb-4 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
              style={{ boxShadow: "0 0 8px var(--primary)" }}
            />
            <span className="text-[0.65rem] md:text-[0.72rem] font-mono uppercase tracking-widest text-muted capitalize truncate">
              {hoyLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => setOpenIngreso(true)}
              className="btn btn-primary"
              style={{ padding: "0.35rem 0.75rem", fontSize: "0.72rem" }}
            >
              + Ingreso
            </button>
            <Link
              href="/panel"
              className="text-[0.62rem] md:text-[0.68rem] font-mono uppercase tracking-widest text-primary hover:underline hidden sm:inline"
            >
              Ver panel →
            </Link>
          </div>
        </div>
        <div className="flex items-start justify-between gap-4 md:gap-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-[1.75rem] leading-[1.05] md:display-hero text-fg text-balance font-light tracking-tight">
              Hola,{" "}
              <span
                className="text-primary"
                style={{ textShadow: "0 0 20px var(--primary-glow)" }}
              >
                {user.nombre}
              </span>
            </h2>
            <p className="text-muted mt-2 md:mt-4 max-w-lg text-[0.85rem] md:text-[0.95rem] leading-relaxed">
              Tienes{" "}
              <span className="text-fg font-medium">
                {data.misAnimalesActivos.length}
              </span>{" "}
              {data.misAnimalesActivos.length === 1 ? "animal" : "animales"} a tu
              nombre y participas del{" "}
              <span className="text-fg font-medium">
                {fmtPct(data.participacionPct)}
              </span>{" "}
              de la operación total.
              {data.tareasPendientes.length > 0
                ? ` Tienes ${data.tareasPendientes.length} tarea${data.tareasPendientes.length > 1 ? "s" : ""} pendiente${data.tareasPendientes.length > 1 ? "s" : ""}.`
                : " No tienes tareas pendientes."}
            </p>
          </div>
          <div
            className="w-14 h-14 md:w-24 md:h-24 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-3xl font-mono font-semibold shrink-0"
            style={{
              background: "var(--primary-soft)",
              color: "var(--primary)",
              border: "1px solid var(--primary)",
              boxShadow: "0 0 40px -8px var(--primary-glow)",
            }}
          >
            {initials}
          </div>
        </div>
      </section>

      {/* Selector de rango */}
      <section className="card">
        <div className="flex items-center gap-2 mb-3">
          <div className="eyebrow eyebrow-primary">Rango</div>
          <span className="text-[0.72rem] md:text-xs text-muted truncate">
            {rango.activo ? "Filtrado activo" : "Sin filtro — toda la operación"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[0.65rem] font-mono uppercase tracking-wider text-muted min-w-0">
            Desde
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full min-w-0"
              style={{ padding: "0.4rem 0.55rem" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-[0.65rem] font-mono uppercase tracking-wider text-muted min-w-0">
            Hasta
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full min-w-0"
              style={{ padding: "0.4rem 0.55rem" }}
            />
          </label>
        </div>
        {rango.activo && (
          <button
            type="button"
            onClick={() => {
              setDesde("");
              setHasta("");
            }}
            className="chip ghost mt-2"
            style={{ padding: "0.3rem 0.7rem", fontSize: "0.7rem" }}
          >
            Limpiar
          </button>
        )}
      </section>

      {/* KPIs — siempre muestran totales de toda la operación */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
        <HeroStat
          label="Mis animales"
          value={data.misAnimalesActivos.length}
          tone="forest"
          sub={
            data.misAnimales.length > data.misAnimalesActivos.length
              ? `+${data.misAnimales.length - data.misAnimalesActivos.length} inactivos`
              : "todos activos"
          }
        />
        <HeroStat
          label="Mis gastos"
          value={fmtCOP(rango.activo ? data.gastosRango : data.gastosTotales)}
          tone="coral"
          size="sm"
          sub={rango.activo ? `Total: ${fmtCOP(data.gastosTotales)}` : "desde el inicio"}
        />
        <HeroStat
          label="Mis ingresos"
          value={fmtCOP(rango.activo ? data.ingresosRango : data.ingresosTotales)}
          tone="moss"
          size="sm"
          sub={rango.activo ? `Total: ${fmtCOP(data.ingresosTotales)}` : "desde el inicio"}
        />
        <HeroStat
          label="Balance"
          value={fmtCOP(rango.activo ? data.balanceRango : data.balanceTotal)}
          tone={(rango.activo ? data.balanceRango : data.balanceTotal) >= 0 ? "citrus" : "coral"}
          size="sm"
          sub={rango.activo ? `Total: ${fmtCOP(data.balanceTotal)}` : "desde el inicio"}
        />
      </section>

      {/* Peso — swipe horizontal por animal */}
      {data.misPesajesPorAnimal.length > 0 && (
        <section className="card">
          <div className="card-head">
            <div>
              <div className="eyebrow eyebrow-primary">Peso</div>
              <h2 className="text-lg font-semibold tracking-tight">
                Crecimiento de tus animales
              </h2>
            </div>
            <Link
              href="/peso"
              className="text-xs text-primary hover:underline font-medium"
            >
              ver todo →
            </Link>
          </div>
          <div
            className="-mx-3 md:-mx-4 px-3 md:px-4 overflow-x-auto pb-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="flex gap-2.5" style={{ width: "max-content" }}>
              {data.misPesajesPorAnimal.map((row) => {
                const { animal, ultimo, gdp, values } = row;
                const positivo = gdp !== null && gdp >= 0;
                return (
                  <div
                    key={animal.id}
                    className="rounded-xl bg-surface-2 p-3 flex flex-col gap-2 shrink-0"
                    style={{ width: "180px" }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[0.65rem] font-mono font-semibold shrink-0"
                        style={{
                          background: "var(--primary-soft)",
                          color: "var(--primary)",
                        }}
                      >
                        {animal.nroIdentificacion}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[0.85rem] truncate leading-tight">
                          {animal.nombre ?? "—"}
                        </div>
                        <div className="text-[0.6rem] text-muted truncate">
                          {values.length} pesaje{values.length === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>
                    <div className="h-10 -mx-1">
                      <Sparkline
                        values={values}
                        width={156}
                        height={40}
                        color={positivo ? "var(--primary)" : "var(--danger)"}
                        fillOpacity={0.18}
                      />
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <div className="font-mono text-lg font-semibold text-fg leading-none tabular-nums">
                          {fmtNumber(ultimo.pesoKg, 0)}
                          <span className="text-[0.65rem] text-muted ml-0.5 font-normal">
                            kg
                          </span>
                        </div>
                        <div className="text-[0.6rem] text-muted mt-0.5">
                          {fmtDate(ultimo.fecha)}
                        </div>
                      </div>
                      {gdp !== null ? (
                        <div
                          className="text-right font-mono text-[0.75rem] font-semibold tabular-nums whitespace-nowrap"
                          style={{
                            color: positivo ? "var(--primary)" : "var(--danger)",
                          }}
                        >
                          {positivo ? "▲" : "▼"} {fmtNumber(Math.abs(gdp), 0)}
                          <span className="text-[0.55rem] text-muted ml-0.5 font-normal">
                            g/día
                          </span>
                        </div>
                      ) : (
                        <div className="text-[0.6rem] text-muted text-right">
                          sin GDP
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-[0.6rem] text-subtle mt-2 font-mono uppercase tracking-wider">
            ← desliza para ver todos →
          </div>
        </section>
      )}

      {/* Dos columnas: animales + tareas */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-w-0">
        <div className="card min-w-0">
          <div className="card-head">
            <div>
              <div className="eyebrow eyebrow-primary">Hato</div>
              <h2 className="text-lg font-semibold tracking-tight">Mis animales</h2>
            </div>
            <Link href="/animales" className="text-xs text-primary hover:underline font-medium">
              ver todos →
            </Link>
          </div>
          {data.misAnimales.length === 0 ? (
            <p className="text-sm text-muted">Aún no tienes animales a tu nombre.</p>
          ) : (
            <ul className="flex flex-col gap-1 -mx-1">
              {data.misAnimales.map((a) => {
                const cat = categoriaDe(a);
                return (
                  <li
                    key={a.id}
                    className="px-3 py-2.5 rounded-lg hover:bg-surface-2 transition flex items-center gap-3"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-mono font-semibold shrink-0"
                      style={{
                        background: "var(--primary-soft)",
                        color: "var(--primary)",
                      }}
                    >
                      {a.nroIdentificacion}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-fg">{a.nombre ?? "—"}</div>
                      <div className="text-xs text-muted">
                        {cat} · {edadTexto(a.fechaNacimiento)}
                      </div>
                    </div>
                    <span
                      className={
                        "chip " +
                        (a.estado === "activo" ? "success" : "ghost")
                      }
                      style={{ padding: "0.15rem 0.55rem", fontSize: "0.62rem" }}
                    >
                      {a.estado}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="eyebrow eyebrow-primary">Pendiente</div>
              <h2 className="text-lg font-semibold tracking-tight">Tus tareas</h2>
            </div>
            <Link href="/tareas" className="text-xs text-primary hover:underline font-medium">
              ver todas →
            </Link>
          </div>
          {data.tareasPendientes.length === 0 ? (
            <p className="text-sm text-muted">Sin pendientes. Todo al día.</p>
          ) : (
            <ul className="flex flex-col gap-1 -mx-1">
              {data.tareasPendientes.slice(0, 6).map((t) => {
                const vencida = t.dias !== null && t.dias < 0;
                const hoy = t.dias === 0;
                return (
                  <li
                    key={t.id}
                    className="px-3 py-2.5 rounded-lg hover:bg-surface-2 transition flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-fg truncate">{t.titulo}</div>
                      <div className="text-xs text-muted">{fmtDate(t.fecha)}</div>
                    </div>
                    <span
                      className={
                        "chip " +
                        (vencida
                          ? "danger"
                          : hoy
                          ? "accent"
                          : t.prioridad === "alta"
                          ? "primary"
                          : "ghost")
                      }
                      style={{ padding: "0.15rem 0.55rem", fontSize: "0.62rem" }}
                    >
                      {vencida
                        ? `${Math.abs(t.dias!)} d atrás`
                        : hoy
                        ? "hoy"
                        : `en ${t.dias} d`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Próximos partos + gastos recientes */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-w-0">
        <div className="card min-w-0">
          <div className="card-head">
            <div>
              <div className="eyebrow eyebrow-primary">Reproducción</div>
              <h2 className="text-lg font-semibold tracking-tight">Tus próximos partos</h2>
            </div>
            <Link href="/reproduccion" className="text-xs text-primary hover:underline font-medium">
              ver todos →
            </Link>
          </div>
          {data.proximosPartos.length === 0 ? (
            <p className="text-sm text-muted">Sin partos previstos.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.proximosPartos.map((p) => {
                const hembra = db!.animales.find((a) => a.id === p.hembraId);
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-fg">
                        {hembra?.nombre ?? "?"}
                      </div>
                      <div className="text-xs text-muted">
                        {fmtDate(p.fechaProbableParto)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="num text-2xl text-primary">{p.dias}</div>
                      <div className="text-[0.6rem] font-mono uppercase tracking-wider text-muted">
                        días
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="eyebrow eyebrow-primary">Cuentas</div>
              <h2 className="text-lg font-semibold tracking-tight">
                Tus gastos ({data.misGastosRango.length})
              </h2>
            </div>
            <Link href="/gastos" className="text-xs text-primary hover:underline font-medium">
              ver todos →
            </Link>
          </div>
          {data.misGastosRango.length === 0 ? (
            <p className="text-sm text-muted">
              {rango.activo
                ? "No hay gastos en el rango seleccionado."
                : "No hay gastos registrados a tu nombre."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {[...data.misGastosRango]
                .sort(
                  (a, b) =>
                    new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
                )
                .map((g) => {
                  const cat = CATEGORIAS_GASTO.find((c) => c.value === g.categoria);
                  const nParts = g.participantes?.length ?? 0;
                  const valor = g.miValor;
                  const compartido = nParts > 1 && g.miParte > 0 && g.miParte !== g.monto;
                  return (
                    <li
                      key={g.id}
                      className="rounded-xl bg-surface-2 p-3 flex flex-col gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-fg text-[0.95rem] leading-tight break-words">
                            {g.concepto}
                          </div>
                          <div className="text-[0.7rem] text-muted mt-0.5">
                            {fmtDate(g.fecha)} · {cat?.label}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono text-[0.95rem] font-semibold text-danger leading-tight">
                            {fmtCOP(valor)}
                          </div>
                          {compartido && (
                            <div className="text-[0.6rem] text-subtle font-mono mt-0.5">
                              de {fmtCOP(g.monto)}
                            </div>
                          )}
                        </div>
                      </div>
                      {(g.yoPague || compartido) && (
                        <div className="flex flex-wrap gap-1.5">
                          {g.yoPague && (
                            <span
                              className="chip primary"
                              style={{ padding: "0.1rem 0.5rem", fontSize: "0.6rem" }}
                            >
                              yo pagué
                            </span>
                          )}
                          {compartido && (
                            <span
                              className="chip ghost"
                              style={{ padding: "0.1rem 0.5rem", fontSize: "0.6rem" }}
                            >
                              compartido /{nParts}
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </section>

      {/* Resumen sanidad */}
      <section className="card">
        <div className="card-head">
          <div>
            <div className="eyebrow eyebrow-primary">Salud</div>
            <h2 className="text-lg font-semibold tracking-tight">
              Sanidad de tus animales ({data.misSanidadRango.length})
            </h2>
          </div>
          <Link href="/sanidad" className="text-xs text-primary hover:underline font-medium">
            ver todo →
          </Link>
        </div>
        {data.misSanidadRango.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="chip ghost" style={{ padding: "0.2rem 0.55rem", fontSize: "0.65rem" }}>
              {data.misSanidadRango.filter((s) => s.tipo === "vacuna").length} vacunas
            </span>
            <span className="chip ghost" style={{ padding: "0.2rem 0.55rem", fontSize: "0.65rem" }}>
              {data.misSanidadRango.filter((s) => s.tipo === "tratamiento").length} tratamientos
            </span>
            <span className="chip ghost" style={{ padding: "0.2rem 0.55rem", fontSize: "0.65rem" }}>
              {data.misSanidadRango.filter((s) => s.tipo === "desparasitacion").length} desparasitaciones
            </span>
          </div>
        )}
        {data.misSanidadRango.length === 0 ? (
          <p className="text-sm text-muted">
            {rango.activo
              ? "No hay eventos de sanidad en el rango seleccionado."
              : "No hay eventos de sanidad registrados en tus animales."}
          </p>
        ) : (
          <ul className="flex flex-col gap-1 -mx-1">
            {[...data.misSanidadRango]
              .sort(
                (a, b) =>
                  new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
              )
              .map((s) => {
                const animal = db!.animales.find((a) => a.id === s.animalId);
                const tipoLabel =
                  TIPOS_SANIDAD.find((t) => t.value === s.tipo)?.label ?? s.tipo;
                const hasCosto = typeof s.costo === "number" && s.costo > 0;
                return (
                  <li
                    key={s.id}
                    className="rounded-xl bg-surface-2 p-3 flex items-start gap-3"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-mono font-semibold shrink-0"
                      style={{
                        background: "var(--primary-soft)",
                        color: "var(--primary)",
                      }}
                    >
                      {animal?.nroIdentificacion ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-fg text-[0.95rem] leading-tight break-words">
                            {s.producto || tipoLabel}
                          </div>
                          <div className="text-[0.7rem] text-muted mt-0.5 break-words">
                            {fmtDate(s.fecha)} · {tipoLabel}
                            {animal?.nombre ? ` · ${animal.nombre}` : ""}
                            {s.veterinario ? ` · ${s.veterinario}` : ""}
                          </div>
                        </div>
                        {hasCosto && (
                          <div className="font-mono text-[0.95rem] font-semibold text-danger whitespace-nowrap shrink-0">
                            {fmtCOP(s.costo!)}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </section>

      <Modal
        open={openIngreso}
        onClose={() => setOpenIngreso(false)}
        title="Nuevo ingreso"
      >
        <IngresoForm
          initial={null}
          onSaved={() => setOpenIngreso(false)}
          onCancel={() => setOpenIngreso(false)}
        />
      </Modal>
    </div>
  );
}

