"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDB } from "@/lib/useDB";
import { useAuth } from "@/lib/useAuth";
import { fmtDate, fmtCOP, fmtNumber, fmtPct, todayISO, ymdLocal } from "@/lib/format";
import { miParticipacion } from "@/lib/participacion";
import { ESPECIES, especiesPresentes } from "@/lib/especies";
import {
  FILTROS_VACIOS,
  PROCESOS,
  SUBTIPOS,
  construirMovimientos,
  filtrar,
  infoProceso,
  miParteGasto,
  rangoAtajo,
  resumir,
  type Filtros,
  type Movimiento,
  type Proceso,
} from "@/lib/actividad";
import HeroStat from "@/components/HeroStat";
import Modal from "@/components/Modal";
import IngresoForm from "@/components/IngresoForm";
import Sparkline from "@/components/Sparkline";
import ExportarPDFButton from "@/components/ExportarPDFButton";

const CLAVE_FILTROS = "rumeapp:miop:filtros";

const ATAJOS: { value: string; label: string }[] = [
  { value: "", label: "Todo" },
  { value: "hoy", label: "Hoy" },
  { value: "7", label: "7 días" },
  { value: "30", label: "30 días" },
  { value: "mes", label: "Este mes" },
  { value: "anio", label: "Este año" },
  { value: "proximos", label: "Próximos 30 días" },
];

const ESTADOS: { value: Filtros["estado"]; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "por_hacer", label: "Por hacer" },
  { value: "vencido", label: "Vencidos" },
  { value: "pendiente", label: "Pendientes" },
  { value: "hecho", label: "Hechos" },
];

const PASO = 60;

export default function MiOperacionPage() {
  const { user } = useAuth();
  const { db, ready } = useDB();
  const [openIngreso, setOpenIngreso] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [atajo, setAtajo] = useState("30");
  const [masFiltros, setMasFiltros] = useState(false);
  const [mostrar, setMostrar] = useState(PASO);
  const [cargado, setCargado] = useState(false);

  // Los filtros se recuerdan en este celular (solo comodidad; si falla, arranca limpio).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CLAVE_FILTROS);
      if (raw) {
        const g = JSON.parse(raw) as { filtros: Filtros; atajo: string };
        const f = { ...FILTROS_VACIOS, ...g.filtros };
        // Las fechas de un atajo se recalculan (el "hoy" de ayer ya no sirve).
        setFiltros(g.atajo !== "custom" ? { ...f, ...rangoAtajo(g.atajo) } : f);
        setAtajo(g.atajo);
      } else {
        setFiltros((f) => ({ ...f, ...rangoAtajo("30") }));
      }
    } catch {
      setFiltros((f) => ({ ...f, ...rangoAtajo("30") }));
    }
    setCargado(true);
  }, []);
  useEffect(() => {
    if (!cargado) return;
    try {
      window.localStorage.setItem(CLAVE_FILTROS, JSON.stringify({ filtros, atajo }));
    } catch {
      /* ignore */
    }
  }, [filtros, atajo, cargado]);

  function cambiar(cambio: Partial<Filtros>) {
    setFiltros((f) => ({ ...f, ...cambio }));
    setMostrar(PASO);
  }

  function escogerAtajo(a: string) {
    setAtajo(a);
    cambiar(rangoAtajo(a));
  }

  function alternarProceso(p: Proceso) {
    const ya = filtros.procesos.includes(p);
    cambiar({ procesos: ya ? filtros.procesos.filter((x) => x !== p) : [...filtros.procesos, p], subtipo: "" });
  }

  function limpiar() {
    setAtajo("");
    setFiltros({ ...FILTROS_VACIOS, alcance: filtros.alcance });
    setMostrar(PASO);
  }

  const miId = user?.id ?? null;
  const todos = useMemo(() => (db ? construirMovimientos(db) : []), [db]);

  // Para contar por proceso: todos los filtros menos el de proceso.
  const sinProceso = useMemo(
    () => filtrar(todos, { ...filtros, procesos: [], subtipo: "" }, miId),
    [todos, filtros, miId]
  );
  const filtrados = useMemo(
    () =>
      // Lo próximo se lee de lo más cercano a lo más lejano; lo pasado, de lo
      // más reciente hacia atrás.
      filtrar(todos, filtros, miId).sort((a, b) => {
        if (a.fecha === b.fecha) return a.proceso.localeCompare(b.proceso);
        const asc = atajo === "proximos";
        return (a.fecha < b.fecha ? 1 : -1) * (asc ? -1 : 1);
      }),
    [todos, filtros, miId, atajo]
  );
  const resumen = useMemo(
    () => (db ? resumir(filtrados, db, filtros.alcance, miId) : null),
    [filtrados, db, filtros.alcance, miId]
  );
  const conteoProceso = useMemo(() => {
    const m = new Map<Proceso, number>();
    for (const x of sinProceso) m.set(x.proceso, (m.get(x.proceso) ?? 0) + 1);
    return m;
  }, [sinProceso]);

  const personal = useMemo(() => {
    if (!db || !miId) return null;
    const mios = db.animales.filter((a) => a.propietarioId === miId);
    const pesos = mios
      .map((a) => {
        const ps = db.pesajes.filter((p) => p.animalId === a.id).sort((x, y) => (x.fecha < y.fecha ? -1 : 1));
        if (!ps.length) return null;
        const u = ps[ps.length - 1];
        const ant = ps.length > 1 ? ps[ps.length - 2] : null;
        let gdp: number | null = null;
        if (ant) {
          const d = (new Date(u.fecha).getTime() - new Date(ant.fecha).getTime()) / 86400000;
          if (d > 0) gdp = ((u.pesoKg - ant.pesoKg) / d) * 1000;
        }
        return { animal: a, ultimo: u, gdp, values: ps.map((p) => p.pesoKg) };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
    return {
      activos: mios.filter((a) => a.estado === "activo").length,
      pct: miParticipacion(miId, db.animales).pct,
      pesos,
    };
  }, [db, miId]);

  if (!ready || !user || !db || !resumen || !personal) {
    return <div className="text-muted">Cargando…</div>;
  }

  const especiesFinca = [
    ...especiesPresentes(db.animales).map((e) => {
      const i = ESPECIES.find((x) => x.value === e)!;
      return { value: e as string, label: `${i.emoji} ${i.plural}` };
    }),
    ...(db.lotes.some((l) => l.especie === "aviar") ? [{ value: "aviar", label: "🐔 Aves" }] : []),
    ...(db.lotes.some((l) => l.especie === "porcino") && !db.animales.some((a) => a.especie === "porcino")
      ? [{ value: "porcino", label: "🐖 Cerdos" }]
      : []),
  ];
  const unProceso = filtros.procesos.length === 1 ? filtros.procesos[0] : null;
  const subtipos = unProceso ? SUBTIPOS[unProceso] : undefined;
  const extrasActivos = [filtros.subtipo, filtros.animalId, filtros.especie, filtros.loteId, filtros.responsableId, filtros.estado, filtros.texto].filter(Boolean).length;
  const hayFiltros = extrasActivos > 0 || filtros.procesos.length > 0 || !!filtros.desde || !!filtros.hasta;
  const balance = resumen.ingresos - resumen.gastos;
  const textoRango =
    filtros.desde || filtros.hasta
      ? `${filtros.desde ? fmtDate(filtros.desde) : "el inicio"} – ${filtros.hasta ? fmtDate(filtros.hasta) : "hoy"}`
      : "desde el inicio";
  const animalesOrden = [...db.animales].sort((a, b) => a.nroIdentificacion.localeCompare(b.nroIdentificacion, "es", { numeric: true }));
  const montoMostrado = (m: Movimiento) =>
    filtros.alcance === "mio" && m.proceso === "gasto" && miId ? -(miParteGasto(db, m.id.slice(4), miId) ?? 0) : m.monto;

  return (
    <div className="space-y-4">
      {/* Saludo */}
      <section className="hero-card !py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[1.5rem] md:text-[2rem] leading-tight font-light tracking-tight">
              Hola, <span className="text-primary">{user.nombre}</span>
            </h2>
            <p className="text-muted mt-1 text-[0.85rem] md:text-[0.95rem]">
              Aquí ve todo lo que pasa en la finca. Tiene{" "}
              <b className="text-fg">{personal.activos}</b> animal{personal.activos === 1 ? "" : "es"} a su cargo
              {personal.pct > 0 ? (
                <>
                  {" "}y participa del <b className="text-fg">{fmtPct(personal.pct)}</b> de la operación
                </>
              ) : null}
              .
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <button type="button" onClick={() => setOpenIngreso(true)} className="btn btn-primary" style={{ padding: "0.35rem 0.75rem", fontSize: "0.72rem" }}>
              + Ingreso
            </button>
            <Link href="/panel" className="text-[0.68rem] font-mono uppercase tracking-widest text-primary hover:underline">
              Ver panel →
            </Link>
          </div>
        </div>
      </section>

      {/* Filtros */}
      <section className="card space-y-3">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="inline-flex rounded-xl p-1 bg-surface-2" role="tablist" aria-label="Alcance">
            {(
              [
                ["finca", "Toda la finca"],
                ["mio", "A mi cargo"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={filtros.alcance === v}
                onClick={() => cambiar({ alcance: v })}
                className={"px-3 py-1.5 rounded-lg text-sm font-semibold transition " + (filtros.alcance === v ? "bg-primary text-white" : "text-muted")}
              >
                {l}
              </button>
            ))}
          </div>
          {hayFiltros && (
            <button type="button" className="text-xs text-primary hover:underline font-medium" onClick={limpiar}>
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Fechas */}
        <div>
          <div className="eyebrow mb-1.5">Fechas</div>
          <div className="flex flex-wrap gap-1.5">
            {ATAJOS.map((a) => (
              <button
                key={a.value || "todo"}
                type="button"
                onClick={() => escogerAtajo(a.value)}
                className={"chip " + (atajo === a.value ? "primary" : "ghost")}
                style={{ padding: "0.3rem 0.7rem", fontSize: "0.72rem", cursor: "pointer" }}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 max-w-md">
            <label className="flex flex-col gap-1 text-[0.65rem] font-mono uppercase tracking-wider text-muted min-w-0">
              Desde
              <input
                type="date"
                value={filtros.desde}
                onChange={(e) => {
                  setAtajo("custom");
                  cambiar({ desde: e.target.value });
                }}
                className="w-full min-w-0"
                style={{ padding: "0.4rem 0.55rem" }}
              />
            </label>
            <label className="flex flex-col gap-1 text-[0.65rem] font-mono uppercase tracking-wider text-muted min-w-0">
              Hasta
              <input
                type="date"
                value={filtros.hasta}
                onChange={(e) => {
                  setAtajo("custom");
                  cambiar({ hasta: e.target.value });
                }}
                className="w-full min-w-0"
                style={{ padding: "0.4rem 0.55rem" }}
              />
            </label>
          </div>
        </div>

        {/* Procesos */}
        <div>
          <div className="eyebrow mb-1.5">Procesos {filtros.procesos.length ? `(${filtros.procesos.length})` : "· todos"}</div>
          <div className="flex flex-wrap gap-1.5">
            {PROCESOS.map((p) => {
              const on = filtros.procesos.includes(p.value);
              const n = conteoProceso.get(p.value) ?? 0;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => alternarProceso(p.value)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.75rem] font-semibold transition"
                  style={{
                    border: `1.5px solid ${on ? p.color : "var(--rule)"}`,
                    background: on ? `${p.color}33` : "transparent",
                    opacity: n || on ? 1 : 0.5,
                  }}
                >
                  <span aria-hidden>{p.emoji}</span>
                  {p.label}
                  <span className="text-muted font-mono text-[0.68rem]">{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        {subtipos && (
          <div>
            <div className="eyebrow mb-1.5">Tipo de {infoProceso(unProceso!).label.toLowerCase()}</div>
            <div className="flex flex-wrap gap-1.5">
              {[{ value: "", label: "Todos" }, ...subtipos].map((s) => (
                <button
                  key={s.value || "todos"}
                  type="button"
                  onClick={() => cambiar({ subtipo: s.value })}
                  className={"chip " + (filtros.subtipo === s.value ? "primary" : "ghost")}
                  style={{ padding: "0.3rem 0.7rem", fontSize: "0.72rem", cursor: "pointer" }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button type="button" onClick={() => setMasFiltros((v) => !v)} className="text-sm text-primary font-medium hover:underline">
          {masFiltros ? "− Menos filtros" : `+ Más filtros${extrasActivos ? ` (${extrasActivos} activos)` : ""}: animal, especie, lote, socio, estado`}
        </button>

        {masFiltros && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Animal</span>
              <select value={filtros.animalId} onChange={(e) => cambiar({ animalId: e.target.value })}>
                <option value="">Todos</option>
                {animalesOrden.map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.nroIdentificacion} {a.nombre ?? ""}
                    {a.estado !== "activo" ? ` (${a.estado})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Especie</span>
              <select value={filtros.especie} onChange={(e) => cambiar({ especie: e.target.value })}>
                <option value="">Todas</option>
                {especiesFinca.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>
            {db.lotes.length > 0 && (
              <label className="flex flex-col gap-1">
                <span className="eyebrow">Lote</span>
                <select value={filtros.loteId} onChange={(e) => cambiar({ loteId: e.target.value })}>
                  <option value="">Todos</option>
                  {db.lotes.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nombre}
                      {l.estado === "cerrado" ? " (cerrado)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {db.propietarios.length > 1 && (
              <label className="flex flex-col gap-1">
                <span className="eyebrow">Socio o responsable</span>
                <select value={filtros.responsableId} onChange={(e) => cambiar({ responsableId: e.target.value })}>
                  <option value="">Todos</option>
                  {db.propietarios.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Estado</span>
              <select value={filtros.estado} onChange={(e) => cambiar({ estado: e.target.value as Filtros["estado"] })}>
                {ESTADOS.map((s) => (
                  <option key={s.value || "todos"} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Buscar</span>
              <input
                type="search"
                value={filtros.texto}
                onChange={(e) => cambiar({ texto: e.target.value })}
                placeholder="Producto, concepto, nombre…"
              />
            </label>
          </div>
        )}
      </section>

      {/* Totales de lo filtrado */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
        <HeroStat
          label="Movimientos"
          value={fmtNumber(resumen.total, 0)}
          tone="forest"
          sub={resumen.vencidos ? `${resumen.vencidos} vencidos · ${resumen.pendientes} pendientes` : `${resumen.pendientes} pendientes`}
        />
        <HeroStat label={filtros.alcance === "mio" ? "Mis gastos" : "Gastos"} value={fmtCOP(resumen.gastos)} tone="coral" size="sm" sub={textoRango} />
        <HeroStat label="Ingresos" value={fmtCOP(resumen.ingresos)} tone="moss" size="sm" sub={textoRango} />
        <HeroStat label="Balance" value={fmtCOP(balance)} tone={balance >= 0 ? "citrus" : "coral"} size="sm" sub={textoRango} />
      </section>

      {/* Desglose */}
      {resumen.total > 0 && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="card">
            <div className="eyebrow eyebrow-primary mb-2">Por proceso</div>
            <Barras
              filas={resumen.porProceso.map((p) => ({
                label: `${infoProceso(p.proceso).emoji} ${infoProceso(p.proceso).label}`,
                valor: p.n,
                texto: String(p.n),
                color: infoProceso(p.proceso).color,
                onClick: () => cambiar({ procesos: [p.proceso], subtipo: "" }),
              }))}
            />
          </div>
          <div className="card">
            <div className="eyebrow eyebrow-primary mb-1">¿En qué se fue la plata?</div>
            <p className="text-[0.68rem] text-muted mb-2">Lo anotado en Gastos, por categoría.</p>
            {resumen.gastosPorCategoria.length === 0 ? (
              <p className="text-sm text-muted">Sin gastos en lo que está filtrado.</p>
            ) : (
              <Barras
                filas={resumen.gastosPorCategoria.map((g) => ({
                  label: g.label,
                  valor: g.monto,
                  texto: fmtCOP(g.monto),
                  color: "#E4A46A",
                }))}
              />
            )}
          </div>
        </section>
      )}

      {/* Línea de tiempo */}
      <section className="card">
        <div className="card-head">
          <div>
            <div className="eyebrow eyebrow-primary">Línea de tiempo</div>
            <h2 className="text-lg font-semibold tracking-tight">
              {resumen.total} movimiento{resumen.total === 1 ? "" : "s"}
            </h2>
          </div>
          <ExportarPDFButton
            titulo="Mi operación"
            subtitulo={`${filtros.alcance === "mio" ? "A mi cargo" : "Toda la finca"} · ${textoRango}${filtros.procesos.length ? " · " + filtros.procesos.map((p) => infoProceso(p).label).join(", ") : ""}`}
            columnas={[
              { header: "Fecha", value: (m: Movimiento) => fmtDate(m.fecha) },
              { header: "Proceso", value: (m: Movimiento) => infoProceso(m.proceso).label },
              { header: "Detalle", value: (m: Movimiento) => [m.titulo, m.detalle].filter(Boolean).join(" — ") },
              { header: "Valor", value: (m: Movimiento) => (montoMostrado(m) !== undefined ? fmtCOP(montoMostrado(m)) : "—") },
              { header: "Estado", value: (m: Movimiento) => (m.estado === "hecho" ? "Hecho" : m.estado === "vencido" ? "Vencido" : "Pendiente") },
            ]}
            filas={filtrados}
            resumen={[
              { label: "Gastos", valor: fmtCOP(resumen.gastos) },
              { label: "Ingresos", valor: fmtCOP(resumen.ingresos) },
              { label: "Balance", valor: fmtCOP(balance) },
            ]}
            nombreArchivo="mi-operacion"
          />
        </div>
        {filtrados.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted">
            No hay movimientos con estos filtros.
            {hayFiltros && (
              <button type="button" className="block mx-auto mt-2 text-primary underline" onClick={limpiar}>
                Ver todo
              </button>
            )}
          </div>
        ) : (
          <LineaDeTiempo movs={filtrados.slice(0, mostrar)} monto={montoMostrado} />
        )}
        {filtrados.length > mostrar && (
          <button type="button" className="btn btn-ghost w-full justify-center mt-3" onClick={() => setMostrar((n) => n + PASO)}>
            Ver {Math.min(PASO, filtrados.length - mostrar)} más ({filtrados.length - mostrar} restantes)
          </button>
        )}
      </section>

      {/* Peso de los animales a su cargo */}
      {personal.pesos.length > 0 && (
        <section className="card">
          <div className="card-head">
            <div>
              <div className="eyebrow eyebrow-primary">Peso</div>
              <h2 className="text-lg font-semibold tracking-tight">Crecimiento de sus animales</h2>
            </div>
            <Link href="/peso" className="text-xs text-primary hover:underline font-medium">
              ver todo →
            </Link>
          </div>
          <div className="-mx-3 md:-mx-4 px-3 md:px-4 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="flex gap-2.5" style={{ width: "max-content" }}>
              {personal.pesos.map(({ animal, ultimo, gdp, values }) => {
                const positivo = gdp !== null && gdp >= 0;
                return (
                  <button
                    key={animal.id}
                    type="button"
                    onClick={() => {
                      setMasFiltros(true);
                      cambiar({ animalId: animal.id });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="rounded-xl bg-surface-2 p-3 flex flex-col gap-2 shrink-0 text-left"
                    style={{ width: "180px" }}
                    title="Ver todos los movimientos de este animal"
                  >
                    <div className="font-semibold text-[0.85rem] truncate">
                      #{animal.nroIdentificacion} {animal.nombre ?? ""}
                    </div>
                    <div className="h-10 -mx-1">
                      <Sparkline values={values} width={156} height={40} color={positivo ? "var(--primary)" : "var(--danger)"} fillOpacity={0.18} />
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="font-mono text-lg font-semibold leading-none tabular-nums">
                        {fmtNumber(ultimo.pesoKg, 0)}
                        <span className="text-[0.65rem] text-muted ml-0.5 font-normal">kg</span>
                      </div>
                      {gdp !== null && (
                        <div className="font-mono text-[0.75rem] font-semibold" style={{ color: positivo ? "var(--primary)" : "var(--danger)" }}>
                          {positivo ? "▲" : "▼"} {fmtNumber(Math.abs(gdp), 0)} g/día
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <Modal open={openIngreso} onClose={() => setOpenIngreso(false)} title="Nuevo ingreso">
        <IngresoForm initial={null} onSaved={() => setOpenIngreso(false)} onCancel={() => setOpenIngreso(false)} />
      </Modal>
    </div>
  );
}

function Barras({
  filas,
}: {
  filas: { label: string; valor: number; texto: string; color: string; onClick?: () => void }[];
}) {
  const max = Math.max(...filas.map((f) => f.valor), 1);
  return (
    <ul className="space-y-1.5">
      {filas.slice(0, 8).map((f) => (
        <li key={f.label}>
          <button
            type="button"
            onClick={f.onClick}
            disabled={!f.onClick}
            className="w-full text-left grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2 text-[0.8rem]"
          >
            <span className="truncate">{f.label}</span>
            <span className="h-2.5 rounded-full bg-surface-2 overflow-hidden">
              <span className="block h-full rounded-full" style={{ width: `${(f.valor / max) * 100}%`, background: f.color }} />
            </span>
            <span className="font-mono text-[0.72rem] tabular-nums text-muted">{f.texto}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function tituloDia(f: string, hoy: string): string {
  const d = new Date(hoy + "T00:00:00");
  const rel = (n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return ymdLocal(x);
  };
  if (f === hoy) return "Hoy";
  if (f === rel(-1)) return "Ayer";
  if (f === rel(1)) return "Mañana";
  const fecha = new Date(f + "T00:00:00").toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: f.slice(0, 4) !== hoy.slice(0, 4) ? "numeric" : undefined,
  });
  return fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

function LineaDeTiempo({ movs, monto }: { movs: Movimiento[]; monto: (m: Movimiento) => number | undefined }) {
  const hoy = todayISO();
  const grupos: { fecha: string; items: Movimiento[] }[] = [];
  for (const m of movs) {
    const g = grupos[grupos.length - 1];
    if (g && g.fecha === m.fecha) g.items.push(m);
    else grupos.push({ fecha: m.fecha, items: [m] });
  }
  return (
    <div className="space-y-4">
      {grupos.map((g) => (
        <div key={g.fecha}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={"text-[0.72rem] font-semibold " + (g.fecha > hoy ? "text-accent" : "text-muted")}>
              {tituloDia(g.fecha, hoy)}
              {g.fecha > hoy ? " · próximo" : ""}
            </span>
            <span className="flex-1 border-t border-rule" />
          </div>
          <ul className="space-y-1.5">
            {g.items.map((m) => {
              const p = infoProceso(m.proceso);
              const valor = monto(m);
              return (
                <li key={m.id}>
                  <Link href={m.href} className="flex items-start gap-3 rounded-xl px-3 py-2.5 bg-surface-2 hover:brightness-95 transition">
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base"
                      style={{ background: `${p.color}40` }}
                      aria-hidden
                    >
                      {p.emoji}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[0.9rem] font-semibold leading-tight break-words">{m.titulo}</span>
                      <span className="block text-[0.72rem] text-muted mt-0.5 break-words">
                        {p.label}
                        {m.detalle ? ` · ${m.detalle}` : ""}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1 shrink-0">
                      {valor !== undefined && valor !== 0 && (
                        <span className={"font-mono text-[0.85rem] font-semibold tabular-nums " + (valor < 0 ? "text-danger" : "text-primary")}>
                          {valor < 0 ? "−" : "+"}
                          {fmtCOP(Math.abs(valor))}
                        </span>
                      )}
                      {m.estado !== "hecho" && (
                        <span className={"chip " + (m.estado === "vencido" ? "danger" : "accent")} style={{ padding: "0.1rem 0.5rem", fontSize: "0.6rem" }}>
                          {m.estado === "vencido" ? "vencido" : "pendiente"}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
