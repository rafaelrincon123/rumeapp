"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useDB } from "@/lib/useDB";
import StatCard from "@/components/StatCard";
import PastureMap from "@/components/PastureMap";
import { fmtCOP, fmtDate, fmtNumber, diasHasta, ymdLocal } from "@/lib/format";

export default function Dashboard() {
  const { db, ready } = useDB();

  const stats = useMemo(() => {
    if (!db) return null;
    const activos = db.animales.filter((a) => a.estado === "activo");
    const vacas = activos.filter((a) => a.categoria === "vaca");
    const terneros = activos.filter(
      (a) => a.categoria === "ternero" || a.categoria === "ternera"
    );

    const proximosPartos = db.servicios
      .filter(
        (s) =>
          (s.resultado === "prenada" || s.resultado === "pendiente") &&
          s.fechaProbableParto
      )
      .map((s) => ({ ...s, dias: diasHasta(s.fechaProbableParto) }))
      .filter((s) => s.dias !== null && s.dias! >= 0 && s.dias! <= 300)
      .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0));

    const proximasVacunas = db.sanidad
      .map((s) => {
        const usa = s.proximoEventoFecha || s.fecha;
        return { ...s, dias: diasHasta(usa), cuando: usa };
      })
      .filter((s) => s.dias !== null && s.dias! >= -14 && s.dias! <= 60)
      .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0));

    const desde = new Date();
    desde.setDate(desde.getDate() - 30);
    const gastos30 = db.gastos
      .filter((g) => new Date(g.fecha) >= desde)
      .reduce((s, g) => s + g.monto, 0);
    const ingresos30 = db.ingresos
      .filter((i) => new Date(i.fecha) >= desde)
      .reduce((s, i) => s + i.monto, 0);

    const leche7: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = ymdLocal(d);
      const total = db.leche
        .filter((l) => l.fecha.slice(0, 10) === key)
        .reduce((s, l) => s + l.litrosManana + l.litrosTarde, 0);
      leche7.push(total);
    }
    const lecheHoy = leche7[leche7.length - 1] ?? 0;
    const promedioLecheDia = leche7.reduce((s, v) => s + v, 0) / 7;

    const semanas = 5;
    const sparkIngresos: number[] = [];
    const sparkGastos: number[] = [];
    for (let w = semanas - 1; w >= 0; w--) {
      const start = new Date();
      start.setDate(start.getDate() - (w + 1) * 7 + 1);
      const end = new Date();
      end.setDate(end.getDate() - w * 7);
      sparkIngresos.push(
        db.ingresos
          .filter((i) => {
            const d = new Date(i.fecha);
            return d >= start && d <= end;
          })
          .reduce((s, i) => s + i.monto, 0)
      );
      sparkGastos.push(
        db.gastos
          .filter((g) => {
            const d = new Date(g.fecha);
            return d >= start && d <= end;
          })
          .reduce((s, g) => s + g.monto, 0)
      );
    }
    const sparkBalance = sparkIngresos.map((v, i) => v - sparkGastos[i]);

    const last3 = leche7.slice(-3).reduce((s, v) => s + v, 0) / 3;
    const prev4 = leche7.slice(0, 4).reduce((s, v) => s + v, 0) / 4;
    const deltaLeche = prev4 ? Math.round(((last3 - prev4) / prev4) * 100) : 0;

    return {
      totalActivos: activos.length,
      vacas: vacas.length,
      terneros: terneros.length,
      proximosPartos,
      proximasVacunas,
      gastos30,
      ingresos30,
      balance30: ingresos30 - gastos30,
      lecheHoy,
      promedioLecheDia,
      leche7,
      sparkBalance,
      deltaLeche,
    };
  }, [db]);

  if (!ready || !stats)
    return <div className="text-muted">Cargando datos…</div>;

  const hoy = new Date();
  const dateFull = hoy.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const lotesActivos = db!.lotes.filter((l) => l.estado === "activo").length;
  const fincaVacia = stats.totalActivos === 0 && lotesActivos === 0;

  return (
    <div className="space-y-4 md:space-y-6 relative z-10">
      {fincaVacia && <BienvenidaVacia />}
      {/* ═══════════════════ HERO CARD ═══════════════════ */}
      <section className="hero-card">
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-5 md:gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" style={{ boxShadow: "0 0 8px var(--primary)" }} />
              <span className="text-[0.65rem] md:text-[0.72rem] font-mono uppercase tracking-widest text-muted capitalize">
                {dateFull}
              </span>
            </div>
            <h2 className="display-hero text-fg text-balance">
              El hato tiene <span className="text-primary" style={{ textShadow: "0 0 20px var(--primary-glow)" }}>{stats.totalActivos} cabezas</span> activas
            </h2>
            <p className="text-muted mt-3 md:mt-4 max-w-lg text-[0.85rem] md:text-[0.95rem] leading-relaxed">
              {stats.vacas} vacas · {stats.terneros} terneros con menos de un año.
              {stats.proximosPartos.length > 0
                ? ` ${stats.proximosPartos.length} parto${stats.proximosPartos.length > 1 ? "s" : ""} previsto${stats.proximosPartos.length > 1 ? "s" : ""}.`
                : ""}
            </p>
            <div className="mt-4 md:mt-6 flex flex-wrap gap-2">
              <Link href="/animales" className="btn btn-primary">
                Ver hato completo →
              </Link>
              <Link href="/gastos" className="btn btn-ghost">
                Cuentas del mes
              </Link>
            </div>
          </div>

          {/* Big number — adaptativo: producción si hay, si no días al próximo parto */}
          {stats.leche7.reduce((s, v) => s + v, 0) > 0 ? (
            <div className="text-left md:text-right">
              <div className="text-[0.62rem] font-mono uppercase tracking-widest text-muted">
                Ordeño 7 d
              </div>
              <div className="num text-[3.5rem] md:text-[6.5rem] text-fg leading-none mt-2">
                {fmtNumber(stats.leche7.reduce((s, v) => s + v, 0), 0)}
                <span className="text-xl md:text-2xl text-muted ml-1 font-normal">L</span>
              </div>
              <div className="mt-2 flex items-center md:justify-end gap-2">
                <span
                  className={
                    "delta " +
                    (stats.deltaLeche > 0 ? "up" : stats.deltaLeche < 0 ? "down" : "flat")
                  }
                >
                  {stats.deltaLeche > 0 ? "↑" : stats.deltaLeche < 0 ? "↓" : ""}
                  {Math.abs(stats.deltaLeche)}% vs sem. previa
                </span>
              </div>
            </div>
          ) : stats.proximosPartos[0] ? (
            <div className="text-left md:text-right">
              <div className="text-[0.62rem] font-mono uppercase tracking-widest text-muted">
                Próximo parto
              </div>
              <div className="num text-[3.5rem] md:text-[6.5rem] text-fg leading-none mt-2">
                {stats.proximosPartos[0].dias}
                <span className="text-xl md:text-2xl text-muted ml-1 font-normal">días</span>
              </div>
              <div className="mt-2 text-xs text-muted">
                {fmtDate(stats.proximosPartos[0].fechaProbableParto)}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* ═══════════════════ KPIs ═══════════════════ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Hato activo"
          value={stats.totalActivos}
          sub={
            <span>
              <span className="text-fg font-medium">{stats.vacas}</span> vacas ·{" "}
              <span className="text-fg font-medium">{stats.terneros}</span> terneros
            </span>
          }
          accent="primary"
        />
        <StatCard
          label={stats.leche7.reduce((s, v) => s + v, 0) > 0 ? "Ordeño hoy" : "Sanidad activa"}
          value={
            stats.leche7.reduce((s, v) => s + v, 0) > 0
              ? fmtNumber(stats.lecheHoy, 1)
              : db!.sanidad.length
          }
          unit={stats.leche7.reduce((s, v) => s + v, 0) > 0 ? "L" : ""}
          spark={stats.leche7.reduce((s, v) => s + v, 0) > 0 ? stats.leche7 : undefined}
          sub={
            stats.leche7.reduce((s, v) => s + v, 0) > 0 ? (
              <>Promedio 7 d: <span className="text-fg font-medium">{fmtNumber(stats.promedioLecheDia, 1)} L</span></>
            ) : (
              <>{stats.proximasVacunas.length} próximos eventos</>
            )
          }
          accent="accent"
        />
        <StatCard
          label="Balance 30 d"
          value={
            <span className={stats.balance30 >= 0 ? "text-success" : "text-danger"}>
              {fmtCOP(stats.balance30).replace("COP", "").trim()}
            </span>
          }
          spark={stats.sparkBalance}
          sub={
            <span className="flex justify-between gap-2">
              <span><span className="text-success">↑</span> {fmtCOP(stats.ingresos30)}</span>
              <span><span className="text-danger">↓</span> {fmtCOP(stats.gastos30)}</span>
            </span>
          }
          accent={stats.balance30 >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="Partos próximos"
          value={stats.proximosPartos.length}
          sub={
            stats.proximosPartos[0]
              ? `Próximo en ${stats.proximosPartos[0].dias} días`
              : "Sin partos previstos"
          }
          accent="primary"
        />
      </section>

      {/* ═══════════════════ TWO COLUMNS ═══════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="text-[0.62rem] font-mono uppercase tracking-widest text-muted mb-1">
                Reproducción
              </div>
              <h2 className="text-lg font-semibold tracking-tight">Partos previstos</h2>
            </div>
            <Link href="/reproduccion" className="text-xs text-primary hover:underline font-medium">
              ver todos →
            </Link>
          </div>
          {stats.proximosPartos.length === 0 ? (
            <p className="text-sm text-muted">Sin partos previstos en el próximo año.</p>
          ) : (
            <ul className="flex flex-col gap-1 -mx-1">
              {stats.proximosPartos.slice(0, 5).map((p) => {
                const hembra = db!.animales.find((a) => a.id === p.hembraId);
                const pct = 1 - ((p.dias ?? 0) / 60);
                return (
                  <li key={p.id} className="px-3 py-3 rounded-lg hover:bg-surface-2 transition flex items-center gap-3 relative overflow-hidden">
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full"
                      style={{
                        background: "var(--primary)",
                        opacity: pct,
                      }}
                    />
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-mono font-semibold"
                      style={{
                        background: "var(--primary-soft)",
                        color: "var(--primary)",
                      }}
                    >
                      {hembra?.nroIdentificacion ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-fg">{hembra?.nombre ?? "?"}</div>
                      <div className="text-xs text-muted">
                        {fmtDate(p.fechaProbableParto)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="num text-2xl text-primary">{p.dias}</div>
                      <div className="text-[0.6rem] font-mono uppercase tracking-wider text-muted">días</div>
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
              <div className="text-[0.62rem] font-mono uppercase tracking-widest text-muted mb-1">
                Sanidad
              </div>
              <h2 className="text-lg font-semibold tracking-tight">Calendario cercano</h2>
            </div>
            <Link href="/sanidad" className="text-xs text-primary hover:underline font-medium">
              ver todo →
            </Link>
          </div>
          {stats.proximasVacunas.length === 0 ? (
            <p className="text-sm text-muted">Sin eventos programados.</p>
          ) : (
            <ul className="flex flex-col gap-1 -mx-1">
              {stats.proximasVacunas.slice(0, 5).map((s) => {
                const animal = db!.animales.find((a) => a.id === s.animalId);
                const vencida = (s.dias ?? 0) < 0;
                return (
                  <li key={s.id} className="px-3 py-3 rounded-lg hover:bg-surface-2 transition flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-mono font-semibold"
                      style={{
                        background: vencida ? "color-mix(in oklab, var(--danger) 14%, transparent)" : "var(--accent-soft)",
                        color: vencida ? "var(--danger)" : "var(--accent)",
                      }}
                    >
                      {s.tipo.slice(0, 3).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-fg truncate">{s.producto}</div>
                      <div className="text-xs text-muted">
                        {animal?.nombre ?? "?"}{" "}
                        <span className="font-mono opacity-70">#{animal?.nroIdentificacion}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={"num text-2xl " + (vencida ? "text-danger" : "text-fg")}
                      >
                        {Math.abs(s.dias!)}
                      </div>
                      <div className={"text-[0.6rem] font-mono uppercase tracking-wider " + (vencida ? "text-danger" : "text-muted")}>
                        {vencida ? "d atrás" : "días"}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ═══════════════════ POTREROS ═══════════════════ */}
      <section className="card">
        <div className="card-head">
          <div>
            <div className="text-[0.62rem] font-mono uppercase tracking-widest text-muted mb-1">
              Manejo
            </div>
            <h2 className="text-lg font-semibold tracking-tight">Ocupación de potreros</h2>
          </div>
          <Link href="/potreros" className="text-xs text-primary hover:underline font-medium">
            ver todos →
          </Link>
        </div>
        <PastureMap potreros={db!.potreros} animales={db!.animales} />
      </section>

      {/* ═══════════════════ COMPOSICIÓN ═══════════════════ */}
      <section className="card">
        <div className="mb-4">
          <div className="text-[0.62rem] font-mono uppercase tracking-widest text-muted mb-1">
            Estructura
          </div>
          <h2 className="text-lg font-semibold tracking-tight">Composición del hato</h2>
        </div>
        <CompositionBars db={db!} />
      </section>
    </div>
  );
}

/** Tarjeta de bienvenida cuando la finca aún no tiene animales ni lotes. */
function BienvenidaVacia() {
  return (
    <section className="card space-y-4">
      <div>
        <div className="text-[0.62rem] font-mono uppercase tracking-widest text-muted mb-1">
          Primeros pasos
        </div>
        <h2 className="text-lg font-semibold tracking-tight">¿Qué animales tiene en la finca?</h2>
        <p className="text-sm text-muted mt-1">
          Empiece por donde más le sirva. Los que se chapetean uno por uno van en Animales; las
          gallinas, los pollos de engorde y los cerdos de ceba se llevan por lote.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link
          href="/animales?nuevo=1"
          className="rounded-xl border border-rule px-4 py-3 hover:bg-surface-2 transition flex items-start gap-3"
        >
          <span className="text-3xl leading-none" aria-hidden>
            🐄
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold">Vacas, búfalos, cabras, ovejas, caballos y cerdos de cría</span>
            <span className="block text-xs text-muted mt-0.5">
              Se registran uno por uno en Animales, con chapeta, raza y plan sanitario.
            </span>
          </span>
          <span className="text-muted" aria-hidden>→</span>
        </Link>
        <Link
          href="/lotes?nuevo=1"
          className="rounded-xl border border-rule px-4 py-3 hover:bg-surface-2 transition flex items-start gap-3"
        >
          <span className="text-3xl leading-none" aria-hidden>
            🐔
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold">Gallinas, pollos de engorde y cerdos de ceba</span>
            <span className="block text-xs text-muted mt-0.5">
              Se llevan por lote en Aves y lotes: huevos, mortalidad, alimento y conversión.
            </span>
          </span>
          <span className="text-muted" aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}

function CompositionBars({ db }: { db: NonNullable<ReturnType<typeof useDB>["db"]> }) {
  const activos = db.animales.filter((a) => a.estado === "activo");
  const cats = [
    { key: "vaca", label: "Vacas" },
    { key: "toro", label: "Toros" },
    { key: "novilla", label: "Novillas" },
    { key: "novillo", label: "Novillos" },
    { key: "ternera", label: "Terneras" },
    { key: "ternero", label: "Terneros" },
  ];
  const total = activos.length || 1;
  return (
    <div className="space-y-3">
      {cats.map((c) => {
        const count = activos.filter((a) => a.categoria === c.key).length;
        const pct = (count / total) * 100;
        return (
          <div key={c.key} className="flex items-center gap-3 text-sm">
            <div className="w-24 text-muted">{c.label}</div>
            <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(90deg, var(--primary) 0%, color-mix(in oklab, var(--primary) 60%, var(--accent)) 100%)",
                  boxShadow: "0 0 8px var(--primary-glow)",
                }}
              />
            </div>
            <div className="w-20 text-right">
              <span className="font-mono tabular-nums text-fg font-medium">{count}</span>
              <span className="text-subtle text-xs ml-1">({Math.round(pct)}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
