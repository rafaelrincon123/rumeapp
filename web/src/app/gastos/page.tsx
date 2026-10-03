"use client";

import { useEffect, useMemo, useState } from "react";
import { useDB } from "@/lib/useDB";
import { useAbrirNuevo } from "@/lib/tutorial";
import { updateCollection, uid, nowISO } from "@/lib/storage";
import { fmtCOP, fmtDate, todayISO } from "@/lib/format";
import {
  Animal,
  CATEGORIAS_ANIMAL,
  CATEGORIAS_GASTO,
  CategoriaGasto,
  Gasto,
  Ingreso,
  Propietario,
} from "@/lib/types";
import Modal from "@/components/Modal";
import FormRow from "@/components/FormRow";
import HeroStat from "@/components/HeroStat";
import IngresoForm, { TIPOS_INGRESO } from "@/components/IngresoForm";
import ExportarPDFButton from "@/components/ExportarPDFButton";
import {
  participantesGasto,
  cuotasPorPropietario,
  participantesPagados,
  toggleParticipantePagado,
} from "@/lib/gastos";

export default function GastosPage() {
  const { db, ready } = useDB();
  const [tab, setTab] = useState<"gastos" | "ingresos">("gastos");
  const [openG, setOpenG] = useState(false);
  const [openI, setOpenI] = useState(false);
  const [editG, setEditG] = useState<Gasto | null>(null);
  const [editI, setEditI] = useState<Ingreso | null>(null);
  const [modeG, setModeG] = useState<"view" | "edit">("view");
  const [modeI, setModeI] = useState<"view" | "edit">("view");
  // Desde el tutorial de primeros pasos: /gastos?nuevo=1 abre el formulario.
  useAbrirNuevo(() => {
    setEditG(null);
    setModeG("edit");
    setOpenG(true);
  }, ready);

  const gastos = useMemo(() => {
    if (!db) return [];
    return [...db.gastos].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }, [db]);

  const ingresos = useMemo(() => {
    if (!db) return [];
    return [...db.ingresos].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }, [db]);

  const totales = useMemo(() => {
    const desde = new Date();
    desde.setDate(desde.getDate() - 30);
    const totalG = gastos
      .filter((g) => new Date(g.fecha) >= desde)
      .reduce((s, g) => s + g.monto, 0);
    const totalI = ingresos
      .filter((i) => new Date(i.fecha) >= desde)
      .reduce((s, i) => s + i.monto, 0);
    const porCat = CATEGORIAS_GASTO.map((c) => ({
      label: c.label,
      total: gastos
        .filter((g) => g.categoria === c.value && new Date(g.fecha) >= desde)
        .reduce((s, g) => s + g.monto, 0),
    }));
    return { totalG, totalI, balance: totalI - totalG, porCat };
  }, [gastos, ingresos]);

  if (!ready) return <div className="text-muted">Cargando…</div>;

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <HeroStat
          label="Ingresos 30 d"
          value={fmtCOP(totales.totalI)}
          tone="moss"
          size="sm"
        />
        <HeroStat
          label="Gastos 30 d"
          value={fmtCOP(totales.totalG)}
          tone="coral"
          size="sm"
        />
        <HeroStat
          label="Balance 30 d"
          value={fmtCOP(totales.balance)}
          tone={totales.balance >= 0 ? "citrus" : "coral"}
          size="sm"
        />
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold tracking-tight mb-3">Gastos por categoría (30 días)</h2>
        {(() => {
          const max = Math.max(1, ...totales.porCat.map((c) => c.total));
          return (
            <div className="space-y-2">
              {totales.porCat.map((c) => (
                <div key={c.label} className="flex items-center gap-3 text-sm">
                  <div className="w-32 text-muted">{c.label}</div>
                  <div className="flex-1 h-2 rounded bg-surface-2 overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${(c.total / max) * 100}%` }}
                    />
                  </div>
                  <div className="w-32 text-right font-mono tabular-nums text-xs">
                    {fmtCOP(c.total)}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </section>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            className={"btn " + (tab === "gastos" ? "btn-primary" : "btn-ghost")}
            onClick={() => setTab("gastos")}
          >
            Gastos ({gastos.length})
          </button>
          <button
            className={"btn " + (tab === "ingresos" ? "btn-primary" : "btn-ghost")}
            onClick={() => setTab("ingresos")}
          >
            Ingresos ({ingresos.length})
          </button>
        </div>
        <div className="flex gap-2">
          {tab === "gastos" ? (
            <>
              <ExportarPDFButton
                titulo="Gastos"
                columnas={[
                  { header: "Fecha", value: (g: Gasto) => fmtDate(g.fecha) },
                  { header: "Categoría", value: (g: Gasto) => CATEGORIAS_GASTO.find((c) => c.value === g.categoria)?.label ?? g.categoria },
                  { header: "Concepto", value: (g: Gasto) => g.concepto },
                  { header: "Proveedor", value: (g: Gasto) => g.proveedor ?? "—" },
                  { header: "Monto", value: (g: Gasto) => fmtCOP(g.monto) },
                  { header: "Pagó", value: (g: Gasto) => db?.propietarios.find((p) => p.id === g.pagadoPor)?.nombre ?? "—" },
                ]}
                filas={gastos}
                resumen={[{ label: "Total", valor: fmtCOP(gastos.reduce((s, g) => s + g.monto, 0)) }]}
                nombreArchivo="gastos"
              />
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditG(null);
                  setModeG("edit");
                  setOpenG(true);
                }}
              >
                + Nuevo gasto
              </button>
            </>
          ) : (
            <>
              <ExportarPDFButton
                titulo="Ingresos"
                columnas={[
                  { header: "Fecha", value: (i: Ingreso) => fmtDate(i.fecha) },
                  { header: "Tipo", value: (i: Ingreso) => TIPOS_INGRESO.find((t) => t.value === i.tipo)?.label ?? i.tipo },
                  { header: "Concepto", value: (i: Ingreso) => i.concepto },
                  { header: "Comprador", value: (i: Ingreso) => i.comprador ?? "—" },
                  { header: "Monto", value: (i: Ingreso) => fmtCOP(i.monto) },
                ]}
                filas={ingresos}
                resumen={[{ label: "Total", valor: fmtCOP(ingresos.reduce((s, i) => s + i.monto, 0)) }]}
                nombreArchivo="ingresos"
              />
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditI(null);
                  setModeI("edit");
                  setOpenI(true);
                }}
              >
                + Nuevo ingreso
              </button>
            </>
          )}
        </div>
      </div>

      {tab === "gastos" && (
        <>
          <DeudasResumen
            gastos={gastos}
            propietarios={db!.propietarios}
            animales={db!.animales}
          />
          <div className="card p-0 overflow-x-auto">
            <table
              className="table"
              style={{ ["--cols" as string]: "9rem 9rem minmax(12rem, 1.5fr) 8rem minmax(12rem, 1.3fr) 9rem 8rem 7rem" }}
            >
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Concepto</th>
                  <th>Pagó</th>
                  <th>Estado de pago</th>
                  <th className="text-right">Monto</th>
                  <th className="text-right">Por c/u</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {gastos.map((g) => {
                  const socio = db!.propietarios.find((p) => p.id === g.pagadoPor);
                  const participantes = participantesGasto(g, db!.animales);
                  const nParticipantes = participantes.length;
                  const cuotas = cuotasPorPropietario(g, db!.animales);
                  const porCabezas = g.repartoPor === "cabezas";
                  const pagados = participantesPagados(g, db!.animales);
                  const nPagados = participantes.filter((id) => pagados.has(id)).length;
                  const todosPagaron = nParticipantes > 0 && nPagados === nParticipantes;
                  // Para modo socios el "por c/u" es único; para cabezas mostramos rango.
                  const cuotasArr = participantes.map((pid) => cuotas[pid] ?? 0);
                  const cuotaMin = cuotasArr.length ? Math.min(...cuotasArr) : 0;
                  const cuotaMax = cuotasArr.length ? Math.max(...cuotasArr) : 0;
                  return (
                    <tr
                      key={g.id}
                      onClick={() => {
                        setEditG(g);
                        setModeG("view");
                        setOpenG(true);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{fmtDate(g.fecha)}</td>
                      <td>
                        <span className="chip">
                          {CATEGORIAS_GASTO.find((c) => c.value === g.categoria)?.label}
                        </span>
                      </td>
                      <td>
                        <div>{g.concepto}</div>
                        {g.proveedor && (
                          <div className="text-muted text-xs">{g.proveedor}</div>
                        )}
                      </td>
                      <td className="text-xs">{socio?.nombre ?? "—"}</td>
                      <td>
                        {nParticipantes === 0 ? (
                          <span className="text-muted text-xs">—</span>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex flex-wrap gap-1">
                              {participantes.map((pid) => {
                                const p = db!.propietarios.find((x) => x.id === pid);
                                if (!p) return null;
                                const on = pagados.has(pid);
                                const esPagador = g.pagadoPor === pid;
                                return (
                                  <button
                                    key={pid}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleParticipantePagado(g, db!.animales, pid);
                                    }}
                                    disabled={esPagador}
                                    className="rounded-full text-[0.6rem] font-mono font-semibold px-2 py-0.5 transition"
                                    style={{
                                      background: on ? "var(--success, #4CA45A)" : "transparent",
                                      color: on ? "#fff" : "var(--muted)",
                                      border: `1px solid ${on ? "var(--success, #4CA45A)" : "var(--rule-strong)"}`,
                                      cursor: esPagador ? "default" : "pointer",
                                      opacity: esPagador ? 0.85 : 1,
                                    }}
                                    title={
                                      esPagador
                                        ? `${p.nombre} · adelantó la plata`
                                        : on
                                        ? `${p.nombre} · ya pagó (click para desmarcar)`
                                        : `${p.nombre} · debe (click para marcar pagado)`
                                    }
                                  >
                                    {on ? "✓ " : ""}
                                    {p.nombre.slice(0, 2).toUpperCase()}
                                  </button>
                                );
                              })}
                            </div>
                            <span
                              className="text-[0.6rem] font-mono uppercase tracking-wider"
                              style={{
                                color: todosPagaron
                                  ? "var(--success, #4CA45A)"
                                  : nPagados === 0
                                  ? "var(--danger)"
                                  : "var(--accent)",
                              }}
                            >
                              {nPagados}/{nParticipantes} {todosPagaron ? "· al día" : "pagados"}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="text-right font-mono tabular-nums">{fmtCOP(g.monto)}</td>
                      <td className="text-right font-mono tabular-nums text-xs">
                        {nParticipantes > 1 ? (
                          porCabezas && cuotaMin !== cuotaMax ? (
                            <span className="text-primary" title="Reparto por cabezas">
                              {fmtCOP(cuotaMin)}–{fmtCOP(cuotaMax)}
                            </span>
                          ) : (
                            <span className="text-primary">{fmtCOP(cuotaMax)}</span>
                          )
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <button
                          className="text-xs text-muted hover:text-fg hover:underline mr-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditG(g);
                            setModeG("view");
                            setOpenG(true);
                          }}
                        >
                          ver
                        </button>
                        <button
                          className="text-xs text-accent hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditG(g);
                            setModeG("edit");
                            setOpenG(true);
                          }}
                        >
                          editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "ingresos" && (
        <div className="card p-0 overflow-x-auto">
          <table
            className="table"
            style={{ ["--cols" as string]: "10rem 10rem minmax(12rem, 1.5fr) minmax(10rem, 1fr) 10rem 7rem" }}
          >
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Concepto</th>
                <th>Comprador</th>
                <th className="text-right">Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ingresos.map((i) => (
                <tr
                  key={i.id}
                  onClick={() => {
                    setEditI(i);
                    setModeI("view");
                    setOpenI(true);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <td>{fmtDate(i.fecha)}</td>
                  <td>
                    <span className="chip">
                      {TIPOS_INGRESO.find((t) => t.value === i.tipo)?.label}
                    </span>
                  </td>
                  <td>{i.concepto}</td>
                  <td className="text-muted text-xs">{i.comprador ?? "—"}</td>
                  <td className="text-right font-mono tabular-nums text-success">
                    {fmtCOP(i.monto)}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button
                      className="text-xs text-muted hover:text-fg hover:underline mr-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditI(i);
                        setModeI("view");
                        setOpenI(true);
                      }}
                    >
                      ver
                    </button>
                    <button
                      className="text-xs text-accent hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditI(i);
                        setModeI("edit");
                        setOpenI(true);
                      }}
                    >
                      editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={openG}
        onClose={() => setOpenG(false)}
        title={editG ? (modeG === "view" ? "Detalle de gasto" : "Editar gasto") : "Nuevo gasto"}
      >
        {editG && modeG === "view" && (
          <div className="flex justify-end mb-3">
            <button
              className="btn btn-primary"
              onClick={() => setModeG("edit")}
              style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}
            >
              Editar
            </button>
          </div>
        )}
        <GastoForm
          initial={editG}
          readOnly={!!editG && modeG === "view"}
          onSaved={() => setOpenG(false)}
          onCancel={() => setOpenG(false)}
        />
      </Modal>
      <Modal
        open={openI}
        onClose={() => setOpenI(false)}
        title={editI ? (modeI === "view" ? "Detalle de ingreso" : "Editar ingreso") : "Nuevo ingreso"}
      >
        {editI && modeI === "view" && (
          <div className="flex justify-end mb-3">
            <button
              className="btn btn-primary"
              onClick={() => setModeI("edit")}
              style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}
            >
              Editar
            </button>
          </div>
        )}
        <IngresoForm
          initial={editI}
          readOnly={!!editI && modeI === "view"}
          onSaved={() => setOpenI(false)}
          onCancel={() => setOpenI(false)}
        />
      </Modal>
    </div>
  );
}

function DeudasResumen({
  gastos,
  propietarios,
  animales,
}: {
  gastos: Gasto[];
  propietarios: Propietario[];
  animales: Animal[];
}) {
  const balances = useMemo(() => {
    // Por cada socio: cuánto le deben (positivo) y cuánto debe (negativo)
    const debe: Record<string, number> = {};
    const leDeben: Record<string, number> = {};
    for (const p of propietarios) {
      debe[p.id] = 0;
      leDeben[p.id] = 0;
    }

    for (const g of gastos) {
      const parts = participantesGasto(g, animales);
      if (parts.length === 0 || !g.pagadoPor) continue;
      const cuotas = cuotasPorPropietario(g, animales);
      const pagados = participantesPagados(g, animales);

      for (const pid of parts) {
        if (pid === g.pagadoPor) continue;
        if (pagados.has(pid)) continue;
        const cuota = cuotas[pid] ?? 0;
        if (cuota <= 0) continue;
        debe[pid] = (debe[pid] ?? 0) + cuota;
        leDeben[g.pagadoPor] = (leDeben[g.pagadoPor] ?? 0) + cuota;
      }
    }

    return propietarios
      .map((p) => ({
        socio: p,
        debe: debe[p.id] ?? 0,
        leDeben: leDeben[p.id] ?? 0,
        neto: (leDeben[p.id] ?? 0) - (debe[p.id] ?? 0),
      }))
      .filter((r) => r.debe > 0 || r.leDeben > 0);
  }, [gastos, propietarios, animales]);

  if (balances.length === 0) return null;

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Cuentas entre socios
        </h2>
        <span className="text-[0.65rem] font-mono uppercase tracking-widest text-subtle">
          basado en participantes y pagos
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {balances.map(({ socio, debe, leDeben, neto }) => {
          const alDia = debe === 0 && leDeben === 0;
          const acreedor = neto > 0;
          return (
            <div
              key={socio.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg"
              style={{
                background: "var(--surface-2)",
                border: `1px solid ${
                  alDia
                    ? "var(--rule)"
                    : acreedor
                    ? "var(--success, #4CA45A)"
                    : "var(--danger)"
                }`,
              }}
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{socio.nombre}</div>
                <div className="text-[0.62rem] font-mono uppercase tracking-wider text-subtle mt-0.5">
                  {debe > 0 && <>debe {fmtCOP(debe)}</>}
                  {debe > 0 && leDeben > 0 && " · "}
                  {leDeben > 0 && <>le deben {fmtCOP(leDeben)}</>}
                  {alDia && "al día"}
                </div>
              </div>
              <div
                className="font-mono tabular-nums text-sm font-semibold shrink-0"
                style={{
                  color: acreedor
                    ? "var(--success, #4CA45A)"
                    : neto < 0
                    ? "var(--danger)"
                    : "var(--muted)",
                }}
              >
                {neto === 0 ? "±0" : `${acreedor ? "+" : ""}${fmtCOP(neto)}`}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GastoForm({
  initial,
  readOnly = false,
  onSaved,
  onCancel,
}: {
  initial: Gasto | null;
  readOnly?: boolean;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { db } = useDB();
  const [form, setForm] = useState<Gasto>(
    initial ?? {
      id: uid(),
      fecha: todayISO(),
      categoria: "alimentacion",
      concepto: "",
      monto: 0,
      createdAt: nowISO(),
    }
  );

  const [selectorAnimales, setSelectorAnimales] = useState(false);
  const modo: "socios" | "cabezas" = form.repartoPor === "cabezas" ? "cabezas" : "socios";
  const animalIds = form.animalIds ?? [];

  // En modo "cabezas" los participantes se derivan de los animales.
  const participantes = useMemo(() => {
    if (modo === "cabezas") {
      const props = new Set<string>();
      for (const aid of animalIds) {
        const a = db?.animales.find((x) => x.id === aid);
        if (a?.propietarioId) props.add(a.propietarioId);
      }
      return Array.from(props);
    }
    return form.participantes ?? [];
  }, [modo, animalIds, db, form.participantes]);

  const nParticipantes = participantes.length;

  // Cuotas por propietario según el modo.
  const cuotas = useMemo(() => {
    const out: Record<string, number> = {};
    if (modo === "cabezas") {
      const cabezas: Record<string, number> = {};
      let total = 0;
      for (const aid of animalIds) {
        const a = db?.animales.find((x) => x.id === aid);
        if (!a?.propietarioId) continue;
        cabezas[a.propietarioId] = (cabezas[a.propietarioId] ?? 0) + 1;
        total += 1;
      }
      if (total > 0 && form.monto > 0) {
        for (const [pid, n] of Object.entries(cabezas)) {
          out[pid] = (n / total) * form.monto;
        }
      }
      return { cuotas: out, cabezas, total };
    }
    if (nParticipantes > 0) {
      const c = form.monto / nParticipantes;
      participantes.forEach((pid) => (out[pid] = c));
    }
    return { cuotas: out, cabezas: {} as Record<string, number>, total: 0 };
  }, [modo, animalIds, db, form.monto, nParticipantes, participantes]);

  const porPersona = nParticipantes > 0 ? form.monto / nParticipantes : 0;
  const pagadosSet = new Set(form.pagadoPorIds ?? []);
  if (form.pagadoPor && participantes.includes(form.pagadoPor)) {
    pagadosSet.add(form.pagadoPor);
  }

  function setModo(m: "socios" | "cabezas") {
    setForm((f) => ({
      ...f,
      repartoPor: m,
      // Al cambiar de modo, limpiar el estado del otro para no confundir.
      ...(m === "socios" ? { animalIds: undefined } : { participantes: undefined }),
    }));
  }

  function toggleParticipantePago(id: string) {
    if (id === form.pagadoPor) return;
    const set = new Set(form.pagadoPorIds ?? []);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    setForm({ ...form, pagadoPorIds: Array.from(set) });
  }

  function toggleParticipante(id: string) {
    const set = new Set(form.participantes ?? []);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    const next = Array.from(set);
    setForm({ ...form, participantes: next.length ? next : undefined });
  }

  function seleccionarTodos() {
    const all = db?.propietarios.map((p) => p.id) ?? [];
    setForm({ ...form, participantes: all.length ? all : undefined });
  }

  function ninguno() {
    setForm({ ...form, participantes: undefined });
  }

  function setAnimalIds(ids: string[]) {
    setForm((f) => ({ ...f, animalIds: ids.length ? ids : undefined }));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.concepto.trim()) return alert("Escribe un concepto");
    if (form.monto <= 0) return alert("Ingresa un monto válido");
    updateCollection("gastos", (list) => [
      ...list.filter((g) => g.id !== form.id),
      form,
    ]);
    onSaved();
  }

  function remove() {
    if (!initial) return;
    if (!confirm("¿Eliminar este gasto?")) return;
    updateCollection("gastos", (list) => list.filter((g) => g.id !== initial.id));
    onSaved();
  }

  return (
    <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <fieldset disabled={readOnly} className="contents">
      <FormRow label="Fecha" required>
        <input
          type="date"
          value={form.fecha.slice(0, 10)}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
        />
      </FormRow>
      <FormRow label="Categoría" required>
        <select
          value={form.categoria}
          onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaGasto })}
        >
          {CATEGORIAS_GASTO.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Concepto" required colspan={2}>
        <input
          value={form.concepto}
          onChange={(e) => setForm({ ...form, concepto: e.target.value })}
          placeholder="Ej. Sal mineralizada 40 kg"
        />
      </FormRow>
      <FormRow label="Monto (COP)" required>
        <input
          type="number"
          value={form.monto}
          onChange={(e) => setForm({ ...form, monto: parseFloat(e.target.value) || 0 })}
        />
      </FormRow>
      <FormRow label="Pagado por" hint="Quién puso la plata">
        <select
          value={form.pagadoPor ?? ""}
          onChange={(e) => setForm({ ...form, pagadoPor: e.target.value || undefined })}
        >
          <option value="">—</option>
          {db?.propietarios.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </FormRow>

      <div className="md:col-span-2 flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="eyebrow">Cómo se reparte</span>
          <div className="flex gap-1.5">
            {[
              { value: "socios" as const, label: "Por socios", hint: "partes iguales" },
              { value: "cabezas" as const, label: "Por cabezas", hint: "proporcional al ganado" },
            ].map((opt) => {
              const on = modo === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setModo(opt.value)}
                  className="btn"
                  style={{
                    padding: "0.35rem 0.8rem",
                    fontSize: "0.75rem",
                    background: on ? "var(--primary)" : "var(--surface-2)",
                    color: on ? "var(--primary-ink)" : "var(--fg)",
                    border: `1px solid ${on ? "var(--primary)" : "var(--rule)"}`,
                  }}
                  title={opt.hint}
                  aria-pressed={on}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {modo === "socios" && (
          <>
            <div className="flex items-center justify-between">
              <span className="eyebrow">
                Participantes de la compra
                {nParticipantes > 0 && (
                  <span className="text-muted normal-case tracking-normal font-sans ml-2">
                    ({nParticipantes})
                  </span>
                )}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={seleccionarTodos}
                  className="text-[0.68rem] text-primary hover:underline font-mono uppercase tracking-wider"
                >
                  todos
                </button>
                {nParticipantes > 0 && (
                  <button
                    type="button"
                    onClick={ninguno}
                    className="text-[0.68rem] text-muted hover:text-danger font-mono uppercase tracking-wider"
                  >
                    ninguno
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {db?.propietarios.map((p) => {
                const on = participantes.includes(p.id);
                const initials = p.nombre.slice(0, 2).toUpperCase();
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => toggleParticipante(p.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition"
                    style={{
                      background: on ? "var(--primary-soft)" : "var(--surface)",
                      borderColor: on ? "var(--primary)" : "var(--rule)",
                      color: on ? "var(--primary)" : "var(--fg)",
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-semibold shrink-0"
                      style={{
                        background: on ? "var(--primary)" : "var(--surface-2)",
                        color: on ? "var(--primary-ink)" : "var(--muted)",
                      }}
                    >
                      {on ? "✓" : initials}
                    </div>
                    <span className="text-sm truncate">{p.nombre}</span>
                  </button>
                );
              })}
            </div>
            {nParticipantes >= 1 && form.monto > 0 && (
              <div
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
              >
                <span>
                  {nParticipantes === 1
                    ? "Un solo participante"
                    : `${nParticipantes} participantes · partes iguales`}
                </span>
                <span className="font-mono font-semibold">
                  {fmtCOP(porPersona)} <span className="text-xs opacity-70">c/u</span>
                </span>
              </div>
            )}
            {nParticipantes === 0 && (
              <p className="text-[0.68rem] text-subtle">
                Sin participantes: el gasto lo asume completo quien lo pagó.
              </p>
            )}
          </>
        )}

        {modo === "cabezas" && (
          <>
            <div className="flex items-center justify-between">
              <span className="eyebrow">
                Animales incluidos
                {animalIds.length > 0 && (
                  <span className="text-muted normal-case tracking-normal font-sans ml-2">
                    ({animalIds.length})
                  </span>
                )}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setSelectorAnimales(true)}
                  className="text-[0.68rem] text-primary hover:underline font-mono uppercase tracking-wider"
                >
                  {animalIds.length > 0 ? "editar selección" : "seleccionar animales"}
                </button>
              )}
            </div>
            {animalIds.length === 0 ? (
              <p className="text-[0.68rem] text-subtle">
                Selecciona los animales para que el gasto se divida entre sus propietarios según cabezas.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {animalIds.slice(0, 20).map((aid) => {
                  const a = db?.animales.find((x) => x.id === aid);
                  if (!a) return null;
                  return (
                    <span
                      key={aid}
                      className="chip"
                      style={{ fontSize: "0.65rem" }}
                    >
                      #{a.nroIdentificacion}
                      {a.nombre ? " " + a.nombre : ""}
                    </span>
                  );
                })}
                {animalIds.length > 20 && (
                  <span className="text-[0.65rem] text-subtle self-center ml-1">
                    +{animalIds.length - 20} más
                  </span>
                )}
              </div>
            )}
            {nParticipantes > 0 && form.monto > 0 && (
              <div
                className="flex flex-col gap-1.5 px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
              >
                <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider opacity-80">
                  <span>Reparto por cabezas</span>
                  <span>{cuotas.total} cabeza{cuotas.total === 1 ? "" : "s"}</span>
                </div>
                {participantes.map((pid) => {
                  const p = db?.propietarios.find((x) => x.id === pid);
                  if (!p) return null;
                  const n = cuotas.cabezas[pid] ?? 0;
                  const c = cuotas.cuotas[pid] ?? 0;
                  return (
                    <div key={pid} className="flex items-center justify-between">
                      <span>
                        {p.nombre}
                        <span className="opacity-60 text-xs ml-1.5">
                          {n} cab
                        </span>
                      </span>
                      <span className="font-mono font-semibold">{fmtCOP(c)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {nParticipantes > 0 && form.monto > 0 && (
        <div className="md:col-span-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="eyebrow">
              Quién ya pagó su parte
              <span className="text-muted normal-case tracking-normal font-sans ml-2">
                ({pagadosSet.size}/{nParticipantes})
              </span>
            </span>
            <span className="text-[0.65rem] text-subtle">
              {fmtCOP(porPersona)} c/u
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {participantes.map((pid) => {
              const p = db?.propietarios.find((x) => x.id === pid);
              if (!p) return null;
              const on = pagadosSet.has(pid);
              const esPagador = form.pagadoPor === pid;
              return (
                <button
                  type="button"
                  key={pid}
                  onClick={() => toggleParticipantePago(pid)}
                  disabled={esPagador}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition"
                  style={{
                    background: on
                      ? "color-mix(in oklab, var(--success, #4CA45A) 14%, transparent)"
                      : "var(--surface)",
                    borderColor: on ? "var(--success, #4CA45A)" : "var(--rule)",
                    color: on ? "var(--success, #4CA45A)" : "var(--fg)",
                    cursor: esPagador ? "default" : "pointer",
                    opacity: esPagador ? 0.9 : 1,
                  }}
                  title={
                    esPagador
                      ? "Adelantó la plata — cuenta como pagado automáticamente"
                      : on
                      ? "Marcado como pagado (click para desmarcar)"
                      : "Debe su parte (click para marcar pagado)"
                  }
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-semibold shrink-0"
                    style={{
                      background: on ? "var(--success, #4CA45A)" : "var(--surface-2)",
                      color: on ? "#fff" : "var(--muted)",
                    }}
                  >
                    {on ? "✓" : p.nombre.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{p.nombre}</div>
                    <div className="text-[0.6rem] text-subtle">
                      {esPagador ? "adelantó la plata" : on ? "al día" : "debe"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <FormRow label="Proveedor" colspan={2}>
        <input
          value={form.proveedor ?? ""}
          onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
        />
      </FormRow>
      <FormRow label="Notas" colspan={2}>
        <textarea
          rows={2}
          value={form.notas ?? ""}
          onChange={(e) => setForm({ ...form, notas: e.target.value })}
        />
      </FormRow>
      </fieldset>
      {!readOnly && (
        <div className="md:col-span-2 flex items-center justify-between pt-2">
          <div>
            {initial ? (
              <button type="button" className="btn btn-danger" onClick={remove}>
                Eliminar
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar</button>
          </div>
        </div>
      )}
      {readOnly && (
        <div className="md:col-span-2 flex justify-end pt-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cerrar</button>
        </div>
      )}

      <SelectorAnimalesModal
        open={selectorAnimales}
        onClose={() => setSelectorAnimales(false)}
        seleccionados={animalIds}
        onSave={(ids) => {
          setAnimalIds(ids);
          setSelectorAnimales(false);
        }}
      />
    </form>
  );
}

function SelectorAnimalesModal({
  open,
  onClose,
  seleccionados,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  seleccionados: string[];
  onSave: (ids: string[]) => void;
}) {
  const { db } = useDB();
  const [sel, setSel] = useState<Set<string>>(new Set(seleccionados));
  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState("");
  const [fPot, setFPot] = useState("");
  const [fProp, setFProp] = useState("");

  // Rehidratar cuando cambia la selección externa (abrir/cerrar).
  useEffect(() => {
    if (open) setSel(new Set(seleccionados));
  }, [seleccionados, open]);

  const animalesFiltrados = useMemo(() => {
    if (!db) return [];
    const term = q.trim().toLowerCase();
    return db.animales
      .filter((a) => a.estado === "activo")
      .filter((a) => (fCat ? a.categoria === fCat : true))
      .filter((a) => (fPot ? a.potreroId === fPot : true))
      .filter((a) => (fProp ? a.propietarioId === fProp : true))
      .filter((a) => {
        if (!term) return true;
        return (
          a.nroIdentificacion.toLowerCase().includes(term) ||
          (a.nombre?.toLowerCase().includes(term) ?? false)
        );
      })
      .sort((a, b) => a.nroIdentificacion.localeCompare(b.nroIdentificacion));
  }, [db, q, fCat, fPot, fProp]);

  function toggle(id: string) {
    const next = new Set(sel);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSel(next);
  }

  function marcarFiltrados() {
    const next = new Set(sel);
    animalesFiltrados.forEach((a) => next.add(a.id));
    setSel(next);
  }

  function desmarcarFiltrados() {
    const next = new Set(sel);
    animalesFiltrados.forEach((a) => next.delete(a.id));
    setSel(next);
  }

  function limpiarFiltros() {
    setQ("");
    setFCat("");
    setFPot("");
    setFProp("");
  }

  const hayFiltros = !!(q || fCat || fPot || fProp);
  const nSel = sel.size;

  return (
    <Modal open={open} onClose={onClose} title="Seleccionar animales para el gasto">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
          <div className="md:col-span-2">
            <div className="eyebrow mb-1">Buscar</div>
            <input
              type="search"
              placeholder="Nº o nombre…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <div className="eyebrow mb-1">Categoría</div>
            <select value={fCat} onChange={(e) => setFCat(e.target.value)}>
              <option value="">Todas</option>
              {CATEGORIAS_ANIMAL.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="eyebrow mb-1">Potrero</div>
            <select value={fPot} onChange={(e) => setFPot(e.target.value)}>
              <option value="">Todos</option>
              {db?.potreros.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <div className="eyebrow mb-1">Propietario</div>
            <select value={fProp} onChange={(e) => setFProp(e.target.value)}>
              <option value="">Todos</option>
              {db?.propietarios.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex gap-2 justify-end">
            <button
              type="button"
              onClick={marcarFiltrados}
              className="text-[0.68rem] text-primary hover:underline font-mono uppercase tracking-wider"
            >
              marcar {hayFiltros ? "filtrados" : "todos"} ({animalesFiltrados.length})
            </button>
            {hayFiltros && (
              <button
                type="button"
                onClick={desmarcarFiltrados}
                className="text-[0.68rem] text-muted hover:text-danger font-mono uppercase tracking-wider"
              >
                desmarcar filtrados
              </button>
            )}
            {hayFiltros && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="text-[0.68rem] text-muted hover:underline font-mono uppercase tracking-wider"
              >
                limpiar filtros
              </button>
            )}
          </div>
        </div>

        <div
          className="rounded-lg border p-2 max-h-[45vh] overflow-y-auto"
          style={{ borderColor: "var(--rule)" }}
        >
          {animalesFiltrados.length === 0 ? (
            <div className="text-center text-muted py-6 text-sm">
              Sin animales que coincidan
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {animalesFiltrados.map((a) => {
                const on = sel.has(a.id);
                const prop = db?.propietarios.find((p) => p.id === a.propietarioId);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggle(a.id)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-left transition"
                    style={{
                      background: on ? "var(--primary-soft)" : "transparent",
                      color: on ? "var(--primary)" : "var(--fg)",
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: on ? "var(--primary)" : "transparent",
                        color: on ? "var(--primary-ink)" : "var(--muted)",
                        border: on ? "1.5px solid var(--primary)" : "1.5px dashed var(--rule-strong)",
                        fontSize: "10px",
                      }}
                    >
                      {on ? "✓" : ""}
                    </div>
                    <span className="font-mono text-xs text-muted">
                      #{a.nroIdentificacion}
                    </span>
                    <span className="text-sm truncate flex-1">{a.nombre ?? "—"}</span>
                    {prop && (
                      <span className="text-[0.6rem] text-subtle font-mono uppercase">
                        {prop.nombre.slice(0, 3)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--rule)" }}>
          <span className="text-sm text-muted">
            {nSel} seleccionado{nSel === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onSave(Array.from(sel))}
            >
              Guardar selección
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

