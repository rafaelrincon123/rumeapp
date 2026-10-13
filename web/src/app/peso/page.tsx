"use client";

import { useMemo, useState } from "react";
import { useDB } from "@/lib/useDB";
import { useAbrirNuevo } from "@/lib/tutorial";
import { updateCollection, uid, nowISO } from "@/lib/storage";
import { fmtDate, fmtNumber, todayISO } from "@/lib/format";
import { Pesaje, TipoPesaje } from "@/lib/types";
import Modal from "@/components/Modal";
import FormRow from "@/components/FormRow";
import AreaChart from "@/components/AreaChart";
import Sparkline from "@/components/Sparkline";
import ExportarPDFButton from "@/components/ExportarPDFButton";

const TIPOS_PESAJE: { value: TipoPesaje; label: string }[] = [
  { value: "nacimiento", label: "Nacimiento" },
  { value: "destete", label: "Destete" },
  { value: "periodico", label: "Periódico" },
  { value: "venta", label: "Venta" },
];

export default function PesoPage() {
  const { db, ready } = useDB();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Pesaje | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [filtroAnimal, setFiltroAnimal] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoPesaje | "">("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // Desde el tutorial o el correo del día 2 (?nuevo=1): abrir el formulario.
  useAbrirNuevo(() => {
    setEdit(null);
    setMode("edit");
    setOpen(true);
  }, ready);

  const pesajesOrdenados = useMemo(() => {
    if (!db) return [];
    return [...db.pesajes].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );
  }, [db]);

  const pesajesFiltrados = useMemo(() => {
    return pesajesOrdenados
      .filter((p) => (filtroAnimal ? p.animalId === filtroAnimal : true))
      .filter((p) => (filtroTipo ? p.tipo === filtroTipo : true))
      .filter((p) => (desde ? p.fecha >= desde : true))
      .filter((p) => (hasta ? p.fecha <= hasta : true))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [pesajesOrdenados, filtroAnimal, filtroTipo, desde, hasta]);

  const filtrosActivos =
    !!filtroAnimal || !!filtroTipo || !!desde || !!hasta;

  function limpiarFiltros() {
    setFiltroAnimal("");
    setFiltroTipo("");
    setDesde("");
    setHasta("");
  }

  // Estadísticas
  const stats = useMemo(() => {
    if (!db) return null;
    const activos = db.animales.filter((a) => a.estado === "activo");
    const sinPesaje = activos.filter(
      (a) => !db.pesajes.some((p) => p.animalId === a.id)
    );
    // último pesaje por animal
    const ultimoPorAnimal = new Map<string, Pesaje>();
    for (const p of pesajesOrdenados) {
      ultimoPorAnimal.set(p.animalId, p);
    }
    const pesoPromedio =
      ultimoPorAnimal.size > 0
        ? Array.from(ultimoPorAnimal.values()).reduce(
            (s, p) => s + p.pesoKg,
            0
          ) / ultimoPorAnimal.size
        : 0;

    // GDP promedio del hato (últimos 60 días)
    const hace60 = new Date();
    hace60.setDate(hace60.getDate() - 60);
    const gdps: number[] = [];
    for (const a of activos) {
      const propios = pesajesOrdenados.filter((p) => p.animalId === a.id);
      if (propios.length < 2) continue;
      const ultimo = propios[propios.length - 1];
      const previos = propios.slice(0, -1);
      const anterior = [...previos]
        .reverse()
        .find((p) => new Date(p.fecha) >= hace60) ?? previos[previos.length - 1];
      if (!anterior) continue;
      const dias =
        (new Date(ultimo.fecha).getTime() -
          new Date(anterior.fecha).getTime()) /
        (1000 * 60 * 60 * 24);
      if (dias <= 0) continue;
      gdps.push(((ultimo.pesoKg - anterior.pesoKg) / dias) * 1000);
    }
    const gdpPromedio =
      gdps.length > 0 ? gdps.reduce((s, x) => s + x, 0) / gdps.length : null;

    return {
      totalPesajes: db.pesajes.length,
      animalesConPeso: ultimoPorAnimal.size,
      sinPesaje: sinPesaje.length,
      pesoPromedio,
      gdpPromedio,
    };
  }, [db, pesajesOrdenados]);

  // Curva de crecimiento del animal seleccionado
  const curva = useMemo(() => {
    if (!filtroAnimal) return null;
    const puntos = pesajesOrdenados.filter((p) => p.animalId === filtroAnimal);
    if (puntos.length === 0) return null;
    return puntos.map((p) => ({
      label: fmtDate(p.fecha).slice(0, 6),
      value: p.pesoKg,
    }));
  }, [filtroAnimal, pesajesOrdenados]);

  const animalSel = useMemo(() => {
    if (!db || !filtroAnimal) return null;
    return db.animales.find((a) => a.id === filtroAnimal) ?? null;
  }, [db, filtroAnimal]);

  // Datos por animal para el strip horizontal
  const pesajesPorAnimal = useMemo(() => {
    if (!db) return [];
    return db.animales
      .filter((a) => a.estado === "activo")
      .map((a) => {
        const puntos = pesajesOrdenados.filter((p) => p.animalId === a.id);
        if (puntos.length === 0) return null;
        const ultimo = puntos[puntos.length - 1];
        const anterior = puntos.length >= 2 ? puntos[puntos.length - 2] : null;
        let gdp: number | null = null;
        if (anterior) {
          const dias =
            (new Date(ultimo.fecha).getTime() -
              new Date(anterior.fecha).getTime()) /
            (1000 * 60 * 60 * 24);
          if (dias > 0)
            gdp = ((ultimo.pesoKg - anterior.pesoKg) / dias) * 1000;
        }
        return { animal: a, puntos, ultimo, gdp, values: puntos.map((p) => p.pesoKg) };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort(
        (a, b) =>
          new Date(b.ultimo.fecha).getTime() -
          new Date(a.ultimo.fecha).getTime()
      );
  }, [db, pesajesOrdenados]);

  if (!ready) return <div className="text-muted">Cargando…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-muted">
          {stats
            ? `${stats.totalPesajes} pesajes · ${stats.animalesConPeso}/${
                stats.animalesConPeso + stats.sinPesaje
              } animales con peso registrado`
            : ""}
        </div>
        <div className="flex gap-2">
          <ExportarPDFButton
            titulo="Control de peso"
            columnas={[
              { header: "Fecha", value: (p: Pesaje) => fmtDate(p.fecha) },
              { header: "Animal", value: (p: Pesaje) => db?.animales.find((a) => a.id === p.animalId)?.nroIdentificacion ?? "—" },
              { header: "Peso (kg)", value: (p: Pesaje) => fmtNumber(p.pesoKg, 0) },
              { header: "Tipo", value: (p: Pesaje) => TIPOS_PESAJE.find((t) => t.value === p.tipo)?.label ?? p.tipo },
              { header: "Notas", value: (p: Pesaje) => p.notas ?? "—" },
            ]}
            filas={pesajesFiltrados}
            nombreArchivo="pesajes"
          />
          <button
            className="btn btn-primary"
            onClick={() => {
              setEdit(null);
              setMode("edit");
              setOpen(true);
            }}
          >
            + Registrar pesaje
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <StatBox
            label="Peso promedio"
            value={
              stats.pesoPromedio > 0
                ? `${fmtNumber(stats.pesoPromedio, 0)}`
                : "—"
            }
            unit="kg"
            hint="último pesaje/animal"
          />
          <StatBox
            label="GDP promedio"
            value={
              stats.gdpPromedio !== null
                ? `${fmtNumber(stats.gdpPromedio, 0)}`
                : "—"
            }
            unit="g/día"
            hint="ganancia diaria"
          />
          <StatBox
            label="Con peso"
            value={String(stats.animalesConPeso)}
            unit="cab."
            hint="al menos 1 pesaje"
          />
          <StatBox
            label="Sin pesaje"
            value={String(stats.sinPesaje)}
            unit="cab."
            hint="animales activos"
            danger={stats.sinPesaje > 0}
          />
        </div>
      )}

      {pesajesPorAnimal.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="eyebrow eyebrow-primary">Animales</div>
              <h2 className="text-lg font-semibold tracking-tight">
                Toca uno para ver su curva
              </h2>
            </div>
            {filtroAnimal && (
              <button
                onClick={() => setFiltroAnimal("")}
                className="chip ghost"
                style={{ padding: "0.25rem 0.6rem", fontSize: "0.65rem" }}
              >
                Ver todos
              </button>
            )}
          </div>
          <div
            className="-mx-3 md:-mx-4 px-3 md:px-4 overflow-x-auto pb-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="flex gap-2.5" style={{ width: "max-content" }}>
              {pesajesPorAnimal.map((row) => {
                const { animal, ultimo, gdp, values } = row;
                const positivo = gdp !== null && gdp >= 0;
                const selected = filtroAnimal === animal.id;
                return (
                  <button
                    type="button"
                    key={animal.id}
                    onClick={() =>
                      setFiltroAnimal(selected ? "" : animal.id)
                    }
                    className={
                      "rounded-xl p-3 flex flex-col gap-2 shrink-0 text-left transition " +
                      (selected
                        ? "bg-primary-soft border border-primary"
                        : "bg-surface-2 border border-transparent hover:border-rule-strong")
                    }
                    style={{ width: "170px" }}
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
                        width={146}
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
                          className="text-right font-mono text-[0.72rem] font-semibold tabular-nums whitespace-nowrap"
                          style={{
                            color: positivo ? "var(--primary)" : "var(--danger)",
                          }}
                        >
                          {positivo ? "▲" : "▼"} {fmtNumber(Math.abs(gdp), 0)}
                          <span className="text-[0.55rem] text-muted ml-0.5 font-normal">
                            g/d
                          </span>
                        </div>
                      ) : (
                        <div className="text-[0.6rem] text-muted text-right">
                          sin GDP
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="card card-tight">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
          <div className="md:col-span-2">
            <div className="eyebrow mb-1">Animal</div>
            <select
              value={filtroAnimal}
              onChange={(e) => setFiltroAnimal(e.target.value)}
            >
              <option value="">Todos</option>
              {db!.animales
                .slice()
                .sort((a, b) =>
                  a.nroIdentificacion.localeCompare(b.nroIdentificacion)
                )
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.nroIdentificacion} {a.nombre ?? ""}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <div className="eyebrow mb-1">Tipo</div>
            <select
              value={filtroTipo}
              onChange={(e) =>
                setFiltroTipo(e.target.value as TipoPesaje | "")
              }
            >
              <option value="">Todos</option>
              {TIPOS_PESAJE.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="eyebrow mb-1">Desde</div>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div>
              <div className="eyebrow mb-1">Hasta</div>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
          </div>
        </div>
        {filtrosActivos && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-rule">
            <span className="text-xs text-muted">
              {pesajesFiltrados.length} pesaje
              {pesajesFiltrados.length === 1 ? "" : "s"}
            </span>
            <button
              className="text-xs text-primary hover:underline font-medium"
              onClick={limpiarFiltros}
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {curva && curva.length >= 2 && animalSel && (
        <div className="card">
          <div className="card-head">
            <div>
              <div className="text-[0.62rem] font-mono uppercase tracking-widest text-muted mb-1">
                Curva de crecimiento
              </div>
              <h2 className="text-lg font-semibold tracking-tight">
                {animalSel.nombre ?? "—"}{" "}
                <span className="font-mono text-sm text-muted">
                  #{animalSel.nroIdentificacion}
                </span>
              </h2>
            </div>
            <div className="text-right">
              <div className="text-[0.62rem] font-mono uppercase tracking-widest text-muted">
                Último peso
              </div>
              <div className="num text-3xl text-primary leading-none mt-1">
                {fmtNumber(curva[curva.length - 1].value, 0)}{" "}
                <span className="text-base text-muted">kg</span>
              </div>
            </div>
          </div>
          <AreaChart
            data={curva}
            color="var(--primary)"
            unit="kg"
            height={220}
          />
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div>
            <div className="eyebrow eyebrow-primary">Historial</div>
            <h2 className="text-lg font-semibold tracking-tight">
              Pesajes ({pesajesFiltrados.length})
            </h2>
          </div>
        </div>
        {pesajesFiltrados.length === 0 ? (
          <p className="text-sm text-muted py-4">
            {filtrosActivos
              ? "Sin pesajes con esos filtros."
              : "Aún no hay pesajes. Registra el primero."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pesajesFiltrados.map((p) => {
              const animal = db!.animales.find((a) => a.id === p.animalId);
              const previos = pesajesOrdenados
                .filter(
                  (x) =>
                    x.animalId === p.animalId &&
                    new Date(x.fecha).getTime() < new Date(p.fecha).getTime()
                )
                .sort(
                  (a, b) =>
                    new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
                );
              const anterior = previos[0];
              let gan: number | null = null;
              if (anterior) {
                const dias =
                  (new Date(p.fecha).getTime() -
                    new Date(anterior.fecha).getTime()) /
                  (1000 * 60 * 60 * 24);
                if (dias > 0)
                  gan = ((p.pesoKg - anterior.pesoKg) / dias) * 1000;
              }
              const positivo = gan !== null && gan >= 0;
              const tipoLabel = TIPOS_PESAJE.find((t) => t.value === p.tipo)?.label;
              return (
                <li
                  key={p.id}
                  onClick={() => {
                    setEdit(p);
                    setMode("view");
                    setOpen(true);
                  }}
                  className="rounded-xl bg-surface-2 p-3 flex items-start gap-3 cursor-pointer hover:border-rule-strong border border-transparent transition"
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
                          {animal?.nombre ?? "—"}
                        </div>
                        <div className="text-[0.7rem] text-muted mt-0.5">
                          {fmtDate(p.fecha)} · {tipoLabel}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-[1rem] font-semibold text-fg leading-tight tabular-nums">
                          {fmtNumber(p.pesoKg, 1)}
                          <span className="text-[0.65rem] text-muted ml-0.5 font-normal">
                            kg
                          </span>
                        </div>
                        {gan !== null && (
                          <div
                            className="text-[0.7rem] font-mono font-semibold tabular-nums mt-0.5"
                            style={{
                              color: positivo ? "var(--primary)" : "var(--danger)",
                            }}
                          >
                            {positivo ? "▲" : "▼"} {fmtNumber(Math.abs(gan), 0)} g/d
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={edit ? (mode === "view" ? "Detalle de pesaje" : "Editar pesaje") : "Registrar pesaje"}
      >
        {edit && mode === "view" && (
          <div className="flex justify-end mb-3">
            <button
              className="btn btn-primary"
              onClick={() => setMode("edit")}
              style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}
            >
              Editar
            </button>
          </div>
        )}
        <PesajeForm
          initial={edit}
          readOnly={!!edit && mode === "view"}
          onSaved={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </div>
  );
}

function StatBox({
  label,
  value,
  unit,
  hint,
  danger,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  danger?: boolean;
}) {
  const color = danger ? "var(--danger)" : "var(--primary)";
  return (
    <div className="card card-tight relative overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: color, opacity: 0.5 }}
      />
      <div className="eyebrow" style={{ color }}>
        {label}
      </div>
      <div
        className="num text-2xl md:text-3xl mt-1.5 tabular-nums whitespace-nowrap"
        style={{ color: "var(--fg)" }}
      >
        {value}
        {unit && (
          <span className="text-sm text-muted ml-1 font-normal">{unit}</span>
        )}
      </div>
      {hint && <div className="text-[0.68rem] text-muted mt-1">{hint}</div>}
    </div>
  );
}

function PesajeForm({
  initial,
  readOnly = false,
  onSaved,
  onCancel,
}: {
  initial: Pesaje | null;
  readOnly?: boolean;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { db } = useDB();
  const [form, setForm] = useState<Pesaje>(
    initial ?? {
      id: uid(),
      animalId: "",
      fecha: todayISO(),
      pesoKg: 0,
      tipo: "periodico",
      createdAt: nowISO(),
    }
  );

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.animalId) return alert("Selecciona el animal");
    if (form.pesoKg <= 0) return alert("Ingresa un peso válido");
    updateCollection("pesajes", (list) => [
      ...list.filter((p) => p.id !== form.id),
      form,
    ]);
    onSaved();
  }

  function remove() {
    if (!initial) return;
    if (!confirm("¿Eliminar este pesaje?")) return;
    updateCollection("pesajes", (list) =>
      list.filter((p) => p.id !== initial.id)
    );
    onSaved();
  }

  return (
    <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <fieldset disabled={readOnly} className="contents">
      <FormRow label="Animal" required colspan={2}>
        <select
          value={form.animalId}
          onChange={(e) => setForm({ ...form, animalId: e.target.value })}
        >
          <option value="">— selecciona —</option>
          {db?.animales
            .filter((a) => a.estado === "activo")
            .sort((a, b) =>
              a.nroIdentificacion.localeCompare(b.nroIdentificacion)
            )
            .map((a) => (
              <option key={a.id} value={a.id}>
                #{a.nroIdentificacion} {a.nombre ?? ""}
              </option>
            ))}
        </select>
      </FormRow>
      <FormRow label="Fecha" required>
        <input
          type="date"
          value={form.fecha.slice(0, 10)}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
        />
      </FormRow>
      <FormRow label="Tipo" required>
        <select
          value={form.tipo}
          onChange={(e) =>
            setForm({ ...form, tipo: e.target.value as TipoPesaje })
          }
        >
          {TIPOS_PESAJE.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Peso (kg)" required colspan={2}>
        <input
          type="number"
          step="0.5"
          value={form.pesoKg}
          onChange={(e) =>
            setForm({ ...form, pesoKg: parseFloat(e.target.value) || 0 })
          }
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
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </div>
      )}
      {readOnly && (
        <div className="md:col-span-2 flex justify-end pt-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cerrar
          </button>
        </div>
      )}
    </form>
  );
}
