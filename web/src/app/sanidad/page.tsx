"use client";

import { useEffect, useMemo, useState } from "react";
import { useDB } from "@/lib/useDB";
import { useAbrirNuevo } from "@/lib/tutorial";
import { updateCollection, uid, nowISO } from "@/lib/storage";
import { fmtDate, fmtCOP, diasHasta, todayISO } from "@/lib/format";
import { SanidadEvento, TIPOS_SANIDAD, TipoSanidad } from "@/lib/types";
import Modal from "@/components/Modal";
import FormRow from "@/components/FormRow";
import { IconCheck } from "@/components/icons";
import ExportarPDFButton from "@/components/ExportarPDFButton";

export default function SanidadPage() {
  const { db, ready } = useDB();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<SanidadEvento | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [tab, setTab] = useState<"historial" | "proximos">("historial");
  const [q, setQ] = useState("");
  const [filtroAnimal, setFiltroAnimal] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoSanidad | "">("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  // Animal preescogido al abrir con /sanidad?nuevo=1&animal=<id>.
  const [animalInicial, setAnimalInicial] = useState("");
  // Desde el tutorial de primeros pasos: /sanidad?nuevo=1 abre el formulario.
  useAbrirNuevo((params) => {
    setAnimalInicial(params.get("animal") ?? "");
    setEdit(null);
    setMode("edit");
    setOpen(true);
  }, ready);

  const eventos = useMemo(() => {
    if (!db) return [];
    const term = q.trim().toLowerCase();
    return [...db.sanidad]
      .filter((e) => (filtroAnimal ? e.animalId === filtroAnimal : true))
      .filter((e) => (filtroTipo ? e.tipo === filtroTipo : true))
      .filter((e) => (desde ? e.fecha >= desde : true))
      .filter((e) => (hasta ? e.fecha <= hasta : true))
      .filter((e) => {
        if (!term) return true;
        const animal = db.animales.find((a) => a.id === e.animalId);
        return (
          e.producto.toLowerCase().includes(term) ||
          (e.dosis?.toLowerCase().includes(term) ?? false) ||
          (e.notas?.toLowerCase().includes(term) ?? false) ||
          (e.veterinario?.toLowerCase().includes(term) ?? false) ||
          (animal?.nombre?.toLowerCase().includes(term) ?? false) ||
          (animal?.nroIdentificacion.toLowerCase().includes(term) ?? false)
        );
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [db, q, filtroAnimal, filtroTipo, desde, hasta]);

  // Pendientes = eventos no realizados. Se ordenan por qué tan vencidos están
  // (los que ya pasaron primero, luego los futuros).
  const proximos = useMemo(() => {
    return eventos
      .filter((e) => !e.completada)
      .map((e) => ({ ...e, dias: diasHasta(e.fecha) }))
      .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0));
  }, [eventos]);

  function toggleCompletada(e: SanidadEvento) {
    const yaHecha = !!e.completada;
    updateCollection("sanidad", (list) =>
      list.map((s) =>
        s.id === e.id
          ? {
              ...s,
              completada: !yaHecha,
              completadaFecha: !yaHecha ? nowISO() : undefined,
            }
          : s
      )
    );
  }

  const filtrosActivos =
    !!q || !!filtroAnimal || !!filtroTipo || !!desde || !!hasta;

  function limpiarFiltros() {
    setQ("");
    setFiltroAnimal("");
    setFiltroTipo("");
    setDesde("");
    setHasta("");
  }

  if (!ready) return <div className="text-muted">Cargando…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            className={"btn " + (tab === "proximos" ? "btn-primary" : "btn-ghost")}
            onClick={() => setTab("proximos")}
          >
            Próximos ({proximos.length})
          </button>
          <button
            className={"btn " + (tab === "historial" ? "btn-primary" : "btn-ghost")}
            onClick={() => setTab("historial")}
          >
            Historial ({eventos.length})
          </button>
        </div>
        <div className="flex gap-2">
          <ExportarPDFButton
            titulo="Sanidad"
            subtitulo={tab === "proximos" ? "Eventos pendientes" : "Historial completo"}
            columnas={[
              { header: "Fecha", value: (e: SanidadEvento) => fmtDate(e.fecha) },
              { header: "Animal", value: (e: SanidadEvento) => db?.animales.find((a) => a.id === e.animalId)?.nroIdentificacion ?? "—" },
              { header: "Tipo", value: (e: SanidadEvento) => TIPOS_SANIDAD.find((t) => t.value === e.tipo)?.label ?? e.tipo },
              { header: "Producto", value: (e: SanidadEvento) => e.producto },
              { header: "Dosis", value: (e: SanidadEvento) => e.dosis ?? "—" },
              { header: "Veterinario", value: (e: SanidadEvento) => e.veterinario ?? "—" },
              { header: "Costo", value: (e: SanidadEvento) => fmtCOP(e.costo) },
              { header: "Estado", value: (e: SanidadEvento) => (e.completada ? "Completado" : "Pendiente") },
            ]}
            filas={tab === "proximos" ? proximos : eventos}
            nombreArchivo="sanidad"
          />
          <button
            className="btn btn-primary"
            onClick={() => {
              setEdit(null);
              setMode("edit");
              setOpen(true);
            }}
          >
            + Nuevo evento
          </button>
        </div>
      </div>

      <div className="card card-tight">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
          <div className="md:col-span-2">
            <div className="eyebrow mb-1">Buscar</div>
            <input
              type="search"
              placeholder="Producto, animal, notas…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <div className="eyebrow mb-1">Animal</div>
            <select value={filtroAnimal} onChange={(e) => setFiltroAnimal(e.target.value)}>
              <option value="">Todos</option>
              {db!.animales
                .sort((a, b) => a.nroIdentificacion.localeCompare(b.nroIdentificacion))
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
              onChange={(e) => setFiltroTipo(e.target.value as TipoSanidad | "")}
            >
              <option value="">Todos</option>
              {TIPOS_SANIDAD.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="eyebrow mb-1">Desde</div>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <div className="eyebrow mb-1">Hasta</div>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>
        {filtrosActivos && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-rule">
            <span className="text-xs text-muted">
              Mostrando <span className="text-fg font-medium">{eventos.length}</span> resultado
              {eventos.length === 1 ? "" : "s"}
            </span>
            <button className="text-xs text-primary hover:underline font-medium" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {tab === "proximos" && (
        <div className="card p-0 overflow-x-auto">
          <table
            className="table"
            style={{ ["--cols" as string]: "3.5rem 10rem minmax(10rem, 1fr) 9rem minmax(10rem, 1.2fr) 8rem" }}
          >
            <thead>
              <tr>
                <th></th>
                <th>Cuándo</th>
                <th>Animal</th>
                <th>Tipo</th>
                <th>Producto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {proximos.length === 0 ? (
                <tr>
                  <td className="row-full text-muted py-6">
                    Sin eventos pendientes
                  </td>
                </tr>
              ) : (
                proximos.map((e) => {
                  const animal = db!.animales.find((a) => a.id === e.animalId);
                  const vencido = (e.dias ?? 0) < 0;
                  return (
                    <tr
                      key={e.id}
                      onClick={() => {
                        setEdit(e);
                        setMode("view");
                        setOpen(true);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <td onClick={(ev) => ev.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => toggleCompletada(e)}
                          title="Marcar realizada"
                          aria-label="Marcar realizada"
                          className="inline-flex items-center justify-center shrink-0 w-5 h-5 rounded-full"
                          style={{
                            background: "transparent",
                            color: "var(--muted)",
                            border: "1.5px dashed var(--rule-strong)",
                            cursor: "pointer",
                          }}
                        />
                      </td>
                      <td>{fmtDate(e.fecha)}</td>
                      <td>
                        {animal?.nombre ?? "—"}{" "}
                        <span className="font-mono text-xs text-muted">
                          #{animal?.nroIdentificacion}
                        </span>
                      </td>
                      <td>
                        <span className="chip">
                          {TIPOS_SANIDAD.find((t) => t.value === e.tipo)?.label}
                        </span>
                      </td>
                      <td>{e.producto}</td>
                      <td>
                        <span className={"chip " + (vencido ? "danger" : "accent")}>
                          {vencido
                            ? `${Math.abs(e.dias!)} d vencida`
                            : e.dias === 0
                            ? "hoy"
                            : `en ${e.dias} d`}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "historial" && (
        <div className="card p-0 overflow-x-auto">
          <table
            className="table"
            style={{ ["--cols" as string]: "3.5rem 10rem minmax(10rem, 1fr) 9rem minmax(10rem, 1.2fr) 7rem 8rem 7rem" }}
          >
            <thead>
              <tr>
                <th></th>
                <th>Fecha</th>
                <th>Animal</th>
                <th>Tipo</th>
                <th>Producto</th>
                <th>Dosis</th>
                <th>Costo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((e) => {
                const animal = db!.animales.find((a) => a.id === e.animalId);
                const hecha = !!e.completada;
                return (
                  <tr
                    key={e.id}
                    onClick={() => {
                      setEdit(e);
                      setMode("view");
                      setOpen(true);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <td onClick={(ev) => ev.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleCompletada(e)}
                        title={hecha ? "Marcar pendiente" : "Marcar realizada"}
                        aria-label={hecha ? "Marcar pendiente" : "Marcar realizada"}
                        className="inline-flex items-center justify-center shrink-0 w-5 h-5 rounded-full"
                        style={{
                          background: hecha ? "var(--primary)" : "transparent",
                          color: hecha ? "var(--primary-ink)" : "var(--muted)",
                          border: hecha
                            ? "1.5px solid var(--primary)"
                            : "1.5px dashed var(--rule-strong)",
                          cursor: "pointer",
                        }}
                      >
                        {hecha ? <IconCheck size={12} strokeWidth={3} /> : null}
                      </button>
                    </td>
                    <td>{fmtDate(e.fecha)}</td>
                    <td>
                      {animal?.nombre ?? "—"}{" "}
                      <span className="font-mono text-xs text-muted">
                        #{animal?.nroIdentificacion}
                      </span>
                    </td>
                    <td>
                      <span className="chip">
                        {TIPOS_SANIDAD.find((t) => t.value === e.tipo)?.label}
                      </span>
                    </td>
                    <td
                      className={hecha ? "" : "font-medium"}
                      style={hecha ? { textDecoration: "line-through", opacity: 0.6 } : undefined}
                    >
                      {e.producto}
                    </td>
                    <td className="font-mono text-xs">{e.dosis ?? "—"}</td>
                    <td className="font-mono text-xs">{fmtCOP(e.costo)}</td>
                    <td className="text-right whitespace-nowrap">
                      <button
                        className="text-xs text-muted hover:text-fg hover:underline mr-2"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setEdit(e);
                          setMode("view");
                          setOpen(true);
                        }}
                      >
                        ver
                      </button>
                      <button
                        className="text-xs text-accent hover:underline"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setEdit(e);
                          setMode("edit");
                          setOpen(true);
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
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setAnimalInicial("");
        }}
        title={edit ? (mode === "view" ? "Detalle de evento" : "Editar evento") : "Nuevo evento sanitario"}
      >
        {edit && mode === "view" && (
          <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
            <button
              className="btn"
              onClick={() => {
                toggleCompletada(edit);
                setOpen(false);
              }}
              style={{
                padding: "0.4rem 0.9rem",
                fontSize: "0.8rem",
                background: edit.completada ? "var(--surface-2)" : "var(--primary-soft)",
                color: edit.completada ? "var(--muted)" : "var(--primary)",
                border: `1px solid ${edit.completada ? "var(--rule)" : "var(--primary)"}`,
              }}
            >
              {edit.completada ? "↺ Marcar pendiente" : "✓ Marcar realizada"}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setMode("edit")}
              style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}
            >
              Editar
            </button>
          </div>
        )}
        <SanidadForm
          initial={edit}
          animalInicial={animalInicial}
          readOnly={!!edit && mode === "view"}
          onSaved={() => {
            setOpen(false);
            setAnimalInicial("");
          }}
          onCancel={() => {
            setOpen(false);
            setAnimalInicial("");
          }}
        />
      </Modal>
    </div>
  );
}

function SanidadForm({
  initial,
  animalInicial = "",
  readOnly = false,
  onSaved,
  onCancel,
}: {
  initial: SanidadEvento | null;
  animalInicial?: string;
  readOnly?: boolean;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { db } = useDB();
  const [form, setForm] = useState<SanidadEvento>(
    initial ?? {
      id: uid(),
      animalId: animalInicial,
      tipo: "vacuna",
      producto: "",
      fecha: todayISO(),
      completada: true,
      completadaFecha: nowISO(),
      createdAt: nowISO(),
    }
  );
  const [estadoManual, setEstadoManual] = useState(!!initial);

  useEffect(() => {
    if (estadoManual) return;
    const soloFecha = (form.fecha || "").slice(0, 10);
    if (!soloFecha) return;
    const auto = soloFecha <= todayISO();
    if (auto !== form.completada) {
      setForm((f) => ({
        ...f,
        completada: auto,
        completadaFecha: auto ? f.completadaFecha ?? nowISO() : undefined,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.fecha, estadoManual]);

  function setEstado(realizada: boolean) {
    setEstadoManual(true);
    setForm((f) => ({
      ...f,
      completada: realizada,
      completadaFecha: realizada ? f.completadaFecha ?? nowISO() : undefined,
    }));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.animalId) {
      alert("Selecciona un animal");
      return;
    }
    if (!form.producto.trim()) {
      alert("Falta el producto o descripción");
      return;
    }
    updateCollection("sanidad", (list) => [
      ...list.filter((s) => s.id !== form.id),
      form,
    ]);
    onSaved();
  }

  function remove() {
    if (!initial) return;
    if (!confirm("¿Eliminar este evento?")) return;
    updateCollection("sanidad", (list) => list.filter((s) => s.id !== initial.id));
    onSaved();
  }

  return (
    <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <fieldset disabled={readOnly} className="contents">
      <FormRow label="Estado" required colspan={2}>
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: false, label: "Programada", hint: "aún no ejecutada" },
            { value: true, label: "Ya realizada", hint: "registro histórico" },
          ].map((opt) => {
            const on = form.completada === opt.value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setEstado(opt.value)}
                className="btn"
                style={{
                  padding: "0.4rem 0.9rem",
                  fontSize: "0.8rem",
                  background: on ? "var(--primary)" : "var(--surface-2)",
                  color: on ? "var(--primary-ink)" : "var(--fg)",
                  border: `1px solid ${on ? "var(--primary)" : "var(--rule)"}`,
                }}
                aria-pressed={on}
                title={opt.hint}
              >
                {opt.label}
              </button>
            );
          })}
          {!estadoManual && !readOnly && (
            <span className="text-[0.65rem] text-subtle self-center ml-1">
              (auto según fecha)
            </span>
          )}
        </div>
      </FormRow>
      <FormRow label="Animal" required colspan={2}>
        <select
          value={form.animalId}
          onChange={(e) => setForm({ ...form, animalId: e.target.value })}
        >
          <option value="">— selecciona —</option>
          {db?.animales
            .filter((a) => a.estado === "activo")
            .map((a) => (
              <option key={a.id} value={a.id}>
                #{a.nroIdentificacion} {a.nombre ?? ""}
              </option>
            ))}
        </select>
      </FormRow>
      <FormRow label="Tipo" required>
        <select
          value={form.tipo}
          onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoSanidad })}
        >
          {TIPOS_SANIDAD.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Producto / descripción" required>
        <input
          value={form.producto}
          onChange={(e) => setForm({ ...form, producto: e.target.value })}
          placeholder="Ej. Fiebre aftosa"
        />
      </FormRow>
      <FormRow label="Fecha" required>
        <input
          type="date"
          value={form.fecha.slice(0, 10)}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
        />
      </FormRow>
      <FormRow label="Próximo evento" hint="Opcional, para calendario">
        <input
          type="date"
          value={form.proximoEventoFecha?.slice(0, 10) ?? ""}
          onChange={(e) =>
            setForm({ ...form, proximoEventoFecha: e.target.value || undefined })
          }
        />
      </FormRow>
      <FormRow label="Dosis">
        <input
          value={form.dosis ?? ""}
          onChange={(e) => setForm({ ...form, dosis: e.target.value })}
          placeholder="Ej. 5 ml"
        />
      </FormRow>
      <FormRow label="Costo (COP)">
        <input
          type="number"
          value={form.costo ?? ""}
          onChange={(e) =>
            setForm({ ...form, costo: parseFloat(e.target.value) || undefined })
          }
        />
      </FormRow>
      <FormRow label="Veterinario" colspan={2}>
        <input
          value={form.veterinario ?? ""}
          onChange={(e) => setForm({ ...form, veterinario: e.target.value })}
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
