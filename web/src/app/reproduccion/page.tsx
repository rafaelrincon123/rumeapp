"use client";

import { useEffect, useMemo, useState } from "react";
import { useDB } from "@/lib/useDB";
import { updateCollection, uid, nowISO } from "@/lib/storage";
import { fmtDate, diasHasta, todayISO, ymdLocal, parseDateLocal } from "@/lib/format";
import {
  CategoriaAnimal,
  Parto,
  ResultadoServicio,
  ServicioReproductivo,
  Sexo,
  TipoServicio,
} from "@/lib/types";
import Modal from "@/components/Modal";
import FormRow from "@/components/FormRow";
import { IconCheck } from "@/components/icons";
import ExportarPDFButton from "@/components/ExportarPDFButton";
import { especieDe, infoEspecie } from "@/lib/especies";

export default function ReproduccionPage() {
  const { db, ready } = useDB();
  const [tab, setTab] = useState<"servicios" | "partos">("servicios");
  const [openServ, setOpenServ] = useState(false);
  const [openPar, setOpenPar] = useState(false);
  const [editServ, setEditServ] = useState<ServicioReproductivo | null>(null);
  const [editPar, setEditPar] = useState<Parto | null>(null);
  const [modeServ, setModeServ] = useState<"view" | "edit">("view");
  const [modePar, setModePar] = useState<"view" | "edit">("view");
  const [filtroAnimal, setFiltroAnimal] = useState("");
  const [filtroResultado, setFiltroResultado] = useState<ResultadoServicio | "">("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const servicios = useMemo(() => {
    if (!db) return [];
    return [...db.servicios]
      .filter((s) => (filtroAnimal ? s.hembraId === filtroAnimal : true))
      .filter((s) => (filtroResultado ? s.resultado === filtroResultado : true))
      .filter((s) => (desde ? s.fechaServicio >= desde : true))
      .filter((s) => (hasta ? s.fechaServicio <= hasta : true))
      .sort(
        (a, b) => new Date(b.fechaServicio).getTime() - new Date(a.fechaServicio).getTime()
      );
  }, [db, filtroAnimal, filtroResultado, desde, hasta]);

  const partos = useMemo(() => {
    if (!db) return [];
    return [...db.partos]
      .filter((p) => (filtroAnimal ? p.madreId === filtroAnimal : true))
      .filter((p) => (desde ? p.fecha >= desde : true))
      .filter((p) => (hasta ? p.fecha <= hasta : true))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [db, filtroAnimal, desde, hasta]);

  const filtrosActivos = !!filtroAnimal || !!filtroResultado || !!desde || !!hasta;

  function limpiarFiltros() {
    setFiltroAnimal("");
    setFiltroResultado("");
    setDesde("");
    setHasta("");
  }

  function toggleCompletadaServicio(s: ServicioReproductivo) {
    const yaHecha = !!s.completada;
    updateCollection("servicios", (list) =>
      list.map((x) =>
        x.id === s.id
          ? {
              ...x,
              completada: !yaHecha,
              completadaFecha: !yaHecha ? nowISO() : undefined,
            }
          : x
      )
    );
  }

  if (!ready) return <div className="text-muted">Cargando…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            className={"btn " + (tab === "servicios" ? "btn-primary" : "btn-ghost")}
            onClick={() => setTab("servicios")}
          >
            Servicios ({servicios.length})
          </button>
          <button
            className={"btn " + (tab === "partos" ? "btn-primary" : "btn-ghost")}
            onClick={() => setTab("partos")}
          >
            Partos ({partos.length})
          </button>
        </div>
        <div className="flex gap-2">
          {tab === "servicios" ? (
            <>
              <ExportarPDFButton
                titulo="Reproducción — Servicios"
                columnas={[
                  { header: "Fecha", value: (s: ServicioReproductivo) => fmtDate(s.fechaServicio) },
                  { header: "Hembra", value: (s: ServicioReproductivo) => db?.animales.find((a) => a.id === s.hembraId)?.nroIdentificacion ?? "—" },
                  { header: "Tipo", value: (s: ServicioReproductivo) => (s.tipo === "monta_natural" ? "Monta natural" : "Inseminación") },
                  { header: "Macho/Referencia", value: (s: ServicioReproductivo) => s.machoIdOReferencia },
                  { header: "Resultado", value: (s: ServicioReproductivo) => s.resultado === "prenada" ? "Preñada" : s.resultado === "vacia" ? "Vacía" : "Pendiente" },
                  { header: "FPP", value: (s: ServicioReproductivo) => fmtDate(s.fechaProbableParto) },
                ]}
                filas={servicios}
                nombreArchivo="reproduccion-servicios"
              />
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditServ(null);
                  setModeServ("edit");
                  setOpenServ(true);
                }}
              >
                + Nuevo servicio
              </button>
            </>
          ) : (
            <>
              <ExportarPDFButton
                titulo="Reproducción — Partos"
                columnas={[
                  { header: "Fecha", value: (p: Parto) => fmtDate(p.fecha) },
                  { header: "Madre", value: (p: Parto) => db?.animales.find((a) => a.id === p.madreId)?.nroIdentificacion ?? "—" },
                  { header: "Cría", value: (p: Parto) => db?.animales.find((a) => a.id === p.terneroId)?.nroIdentificacion ?? "—" },
                  { header: "Peso cría (kg)", value: (p: Parto) => p.pesoTerneroKg !== undefined ? String(p.pesoTerneroKg) : "—" },
                  { header: "Sexo cría", value: (p: Parto) => p.sexoTernero === "hembra" ? "Hembra" : p.sexoTernero === "macho" ? "Macho" : "—" },
                  { header: "Complicaciones", value: (p: Parto) => p.complicaciones ?? "—" },
                ]}
                filas={partos}
                nombreArchivo="reproduccion-partos"
              />
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditPar(null);
                  setModePar("edit");
                  setOpenPar(true);
                }}
              >
                + Registrar parto
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card card-tight">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
          <div className="md:col-span-2">
            <div className="eyebrow mb-1">
              {tab === "servicios" ? "Hembra" : "Madre"}
            </div>
            <select value={filtroAnimal} onChange={(e) => setFiltroAnimal(e.target.value)}>
              <option value="">Todas</option>
              {db!.animales
                .filter((a) => a.sexo === "hembra")
                .sort((a, b) => a.nroIdentificacion.localeCompare(b.nroIdentificacion))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.nroIdentificacion} {a.nombre ?? ""}
                  </option>
                ))}
            </select>
          </div>
          {tab === "servicios" && (
            <div>
              <div className="eyebrow mb-1">Resultado</div>
              <select
                value={filtroResultado}
                onChange={(e) =>
                  setFiltroResultado(e.target.value as ResultadoServicio | "")
                }
              >
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="prenada">Preñada</option>
                <option value="vacia">Vacía</option>
              </select>
            </div>
          )}
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
              {tab === "servicios"
                ? `${servicios.length} servicio${servicios.length === 1 ? "" : "s"}`
                : `${partos.length} parto${partos.length === 1 ? "" : "s"}`}
            </span>
            <button className="text-xs text-primary hover:underline font-medium" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {tab === "servicios" && (
        <div className="card p-0 overflow-x-auto">
          <table
            className="table"
            style={{ ["--cols" as string]: "3.5rem 10rem minmax(9rem, 1fr) minmax(10rem, 1.2fr) 8rem 8rem 10rem 7rem" }}
          >
            <thead>
              <tr>
                <th></th>
                <th>Fecha servicio</th>
                <th>Hembra</th>
                <th>Macho / semen</th>
                <th>Tipo</th>
                <th>Resultado</th>
                <th>Parto probable</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {servicios.map((s) => {
                const hembra = db!.animales.find((a) => a.id === s.hembraId);
                const macho = db!.animales.find((a) => a.id === s.machoIdOReferencia);
                const dias = s.fechaProbableParto ? diasHasta(s.fechaProbableParto) : null;
                const hecha = !!s.completada;
                return (
                  <tr
                    key={s.id}
                    onClick={() => {
                      setEditServ(s);
                      setModeServ("view");
                      setOpenServ(true);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <td onClick={(ev) => ev.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleCompletadaServicio(s)}
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
                    <td>{fmtDate(s.fechaServicio)}</td>
                    <td>
                      {hembra?.nombre ?? "—"}{" "}
                      <span className="font-mono text-xs text-muted">
                        #{hembra?.nroIdentificacion}
                      </span>
                    </td>
                    <td>
                      {macho
                        ? `#${macho.nroIdentificacion} ${macho.nombre ?? ""}`
                        : s.machoIdOReferencia}
                    </td>
                    <td>
                      <span className="chip">
                        {s.tipo === "monta_natural" ? "Monta" : "Inseminación"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          "chip " +
                          (s.resultado === "prenada"
                            ? "success"
                            : s.resultado === "vacia"
                            ? "danger"
                            : "accent")
                        }
                      >
                        {s.resultado}
                      </span>
                    </td>
                    <td>
                      {s.fechaProbableParto ? (
                        <span>
                          {fmtDate(s.fechaProbableParto)}
                          {dias !== null && dias >= 0 && dias <= 60 ? (
                            <span className="text-muted text-xs ml-1">
                              (en {dias} d)
                            </span>
                          ) : null}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <button
                        className="text-xs text-muted hover:text-fg hover:underline mr-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditServ(s);
                          setModeServ("view");
                          setOpenServ(true);
                        }}
                      >
                        ver
                      </button>
                      <button
                        className="text-xs text-accent hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditServ(s);
                          setModeServ("edit");
                          setOpenServ(true);
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

      {tab === "partos" && (
        <div className="card p-0 overflow-x-auto">
          <table
            className="table"
            style={{ ["--cols" as string]: "10rem minmax(10rem, 1fr) minmax(10rem, 1fr) 6rem 8rem minmax(10rem, 1.2fr) 7rem" }}
          >
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Madre</th>
                <th>Cría</th>
                <th>Sexo</th>
                <th>Peso al nacer</th>
                <th>Notas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {partos.map((p) => {
                const madre = db!.animales.find((a) => a.id === p.madreId);
                const ternero = db!.animales.find((a) => a.id === p.terneroId);
                return (
                  <tr
                    key={p.id}
                    onClick={() => {
                      setEditPar(p);
                      setModePar("view");
                      setOpenPar(true);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{fmtDate(p.fecha)}</td>
                    <td>
                      {madre?.nombre ?? "—"}{" "}
                      <span className="font-mono text-xs text-muted">
                        #{madre?.nroIdentificacion}
                      </span>
                    </td>
                    <td>
                      {ternero
                        ? `#${ternero.nroIdentificacion} ${ternero.nombre ?? ""}`
                        : p.nacidosVivos !== undefined || p.nacidosMuertos !== undefined
                          ? `Camada: ${p.nacidosVivos ?? 0} vivas${p.nacidosMuertos ? ` · ${p.nacidosMuertos} muertas` : ""}`
                          : "—"}
                    </td>
                    <td>{p.sexoTernero === "hembra" ? "♀" : p.sexoTernero === "macho" ? "♂" : "—"}</td>
                    <td className="font-mono text-xs">
                      {p.pesoTerneroKg ? `${p.pesoTerneroKg} kg` : "—"}
                    </td>
                    <td className="text-xs text-muted">
                      {p.complicaciones ?? p.notas ?? ""}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <button
                        className="text-xs text-muted hover:text-fg hover:underline mr-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditPar(p);
                          setModePar("view");
                          setOpenPar(true);
                        }}
                      >
                        ver
                      </button>
                      <button
                        className="text-xs text-accent hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditPar(p);
                          setModePar("edit");
                          setOpenPar(true);
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
        open={openServ}
        onClose={() => setOpenServ(false)}
        title={editServ ? (modeServ === "view" ? "Detalle de servicio" : "Editar servicio") : "Nuevo servicio reproductivo"}
      >
        {editServ && modeServ === "view" && (
          <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
            <button
              className="btn"
              onClick={() => {
                toggleCompletadaServicio(editServ);
                setOpenServ(false);
              }}
              style={{
                padding: "0.4rem 0.9rem",
                fontSize: "0.8rem",
                background: editServ.completada ? "var(--surface-2)" : "var(--primary-soft)",
                color: editServ.completada ? "var(--muted)" : "var(--primary)",
                border: `1px solid ${editServ.completada ? "var(--rule)" : "var(--primary)"}`,
              }}
            >
              {editServ.completada ? "↺ Marcar pendiente" : "✓ Marcar realizada"}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setModeServ("edit")}
              style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}
            >
              Editar
            </button>
          </div>
        )}
        <ServicioForm
          initial={editServ}
          readOnly={!!editServ && modeServ === "view"}
          onSaved={() => setOpenServ(false)}
          onCancel={() => setOpenServ(false)}
        />
      </Modal>

      <Modal
        open={openPar}
        onClose={() => setOpenPar(false)}
        title={editPar ? (modePar === "view" ? "Detalle de parto" : "Editar parto") : "Registrar parto"}
      >
        {editPar && modePar === "view" && (
          <div className="flex justify-end mb-3">
            <button
              className="btn btn-primary"
              onClick={() => setModePar("edit")}
              style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}
            >
              Editar
            </button>
          </div>
        )}
        <PartoForm
          initial={editPar}
          readOnly={!!editPar && modePar === "view"}
          onSaved={() => setOpenPar(false)}
          onCancel={() => setOpenPar(false)}
        />
      </Modal>
    </div>
  );
}

function ServicioForm({
  initial,
  readOnly = false,
  onSaved,
  onCancel,
}: {
  initial: ServicioReproductivo | null;
  readOnly?: boolean;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { db } = useDB();
  const [form, setForm] = useState<ServicioReproductivo>(
    initial ?? {
      id: uid(),
      hembraId: "",
      machoIdOReferencia: "",
      tipo: "monta_natural",
      fechaServicio: todayISO(),
      resultado: "pendiente",
      completada: true,
      completadaFecha: nowISO(),
      createdAt: nowISO(),
    }
  );
  const [estadoManual, setEstadoManual] = useState(!!initial);

  useEffect(() => {
    if (estadoManual) return;
    const soloFecha = (form.fechaServicio || "").slice(0, 10);
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
  }, [form.fechaServicio, estadoManual]);

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
    if (!form.hembraId) return alert("Selecciona la hembra");
    if (!form.machoIdOReferencia.trim()) return alert("Indica el macho o el semen usado");
    // Fecha probable de parto según la gestación de la especie (vaca ~283 días,
    // cabra ~150, yegua ~340…) si no está puesta y quedó preñada.
    const payload = { ...form };
    if (payload.resultado === "prenada" && !payload.fechaProbableParto) {
      const base = parseDateLocal(payload.fechaServicio);
      const hembra = db?.animales.find((a) => a.id === payload.hembraId);
      if (base) {
        base.setDate(base.getDate() + infoEspecie(hembra?.especie).gestacionDias);
        payload.fechaProbableParto = ymdLocal(base);
      }
    }
    updateCollection("servicios", (list) => [
      ...list.filter((s) => s.id !== payload.id),
      payload,
    ]);
    onSaved();
  }

  function remove() {
    if (!initial) return;
    if (!confirm("¿Eliminar este servicio?")) return;
    updateCollection("servicios", (list) => list.filter((s) => s.id !== initial.id));
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
      <FormRow label="Hembra" required colspan={2}>
        <select
          value={form.hembraId}
          onChange={(e) => setForm({ ...form, hembraId: e.target.value })}
        >
          <option value="">— selecciona —</option>
          {db?.animales
            .filter((a) => a.sexo === "hembra" && a.estado === "activo")
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
          onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoServicio })}
        >
          <option value="monta_natural">Monta natural</option>
          <option value="inseminacion">Inseminación</option>
        </select>
      </FormRow>
      <FormRow label="Fecha servicio" required>
        <input
          type="date"
          value={form.fechaServicio.slice(0, 10)}
          onChange={(e) => setForm({ ...form, fechaServicio: e.target.value })}
        />
      </FormRow>
      {form.tipo === "monta_natural" ? (
        <FormRow label="Toro" required colspan={2}>
          <select
            value={form.machoIdOReferencia}
            onChange={(e) => setForm({ ...form, machoIdOReferencia: e.target.value })}
          >
            <option value="">— selecciona —</option>
            {db?.animales
              .filter((a) => a.sexo === "macho" && a.estado === "activo")
              .map((a) => (
                <option key={a.id} value={a.id}>
                  #{a.nroIdentificacion} {a.nombre ?? ""}
                </option>
              ))}
          </select>
        </FormRow>
      ) : (
        <FormRow label="Semen / referencia" required colspan={2}>
          <input
            value={form.machoIdOReferencia}
            onChange={(e) => setForm({ ...form, machoIdOReferencia: e.target.value })}
            placeholder="Ej. Pajilla Girolando lote 22"
          />
        </FormRow>
      )}
      <FormRow label="Resultado" required>
        <select
          value={form.resultado}
          onChange={(e) => setForm({ ...form, resultado: e.target.value as ResultadoServicio })}
        >
          <option value="pendiente">Pendiente</option>
          <option value="prenada">Preñada</option>
          <option value="vacia">Vacía</option>
        </select>
      </FormRow>
      <FormRow label="Fecha diagnóstico">
        <input
          type="date"
          value={form.fechaDiagnostico?.slice(0, 10) ?? ""}
          onChange={(e) =>
            setForm({ ...form, fechaDiagnostico: e.target.value || undefined })
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
    </form>
  );
}

function PartoForm({
  initial,
  readOnly = false,
  onSaved,
  onCancel,
}: {
  initial: Parto | null;
  readOnly?: boolean;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { db } = useDB();
  const [form, setForm] = useState<Parto>(
    initial ?? {
      id: uid(),
      madreId: "",
      fecha: todayISO(),
      createdAt: nowISO(),
    }
  );
  const [crearTernero, setCrearTernero] = useState(!initial);
  const [nroTernero, setNroTernero] = useState("");
  const [nombreTernero, setNombreTernero] = useState("");
  // Cerdas, cabras y ovejas paren camadas: se anotan vivos y muertos.
  const madreSel = db?.animales.find((a) => a.id === form.madreId);
  const camada = !!madreSel && ["porcino", "caprino", "ovino"].includes(especieDe(madreSel));

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.madreId) return alert("Selecciona la madre");
    const payload = { ...form };

    if (crearTernero && !initial) {
      if (!nroTernero.trim()) return alert("Escriba el número de la cría");
      const madre = db!.animales.find((a) => a.id === form.madreId);
      const nuevoAnimal = {
        id: uid(),
        especie: madre ? especieDe(madre) : undefined,
        nroIdentificacion: nroTernero,
        nombre: nombreTernero || undefined,
        sexo: (payload.sexoTernero ?? "hembra") as Sexo,
        raza: madre?.raza ?? "",
        fechaNacimiento: payload.fecha,
        madreId: form.madreId,
        categoria: (payload.sexoTernero === "macho" ? "ternero" : "ternera") as CategoriaAnimal,
        estado: "activo" as const,
        potreroId: madre?.potreroId,
        createdAt: nowISO(),
      };
      updateCollection("animales", (list) => [...list, nuevoAnimal]);
      payload.terneroId = nuevoAnimal.id;

      // Registrar pesaje inicial si dieron peso
      if (payload.pesoTerneroKg) {
        updateCollection("pesajes", (list) => [
          ...list,
          {
            id: uid(),
            animalId: nuevoAnimal.id,
            fecha: payload.fecha,
            pesoKg: payload.pesoTerneroKg!,
            tipo: "nacimiento",
            createdAt: nowISO(),
          },
        ]);
      }
    }

    updateCollection("partos", (list) => [
      ...list.filter((p) => p.id !== payload.id),
      payload,
    ]);
    onSaved();
  }

  function remove() {
    if (!initial) return;
    if (!confirm("¿Eliminar este parto? (No borra la ficha de la cría)")) return;
    updateCollection("partos", (list) => list.filter((p) => p.id !== initial.id));
    onSaved();
  }

  return (
    <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <fieldset disabled={readOnly} className="contents">
      <FormRow label="Madre" required colspan={2}>
        <select
          value={form.madreId}
          onChange={(e) => {
            const m = db?.animales.find((a) => a.id === e.target.value);
            // Los lechones casi nunca llevan ficha propia: se anota la camada.
            if (m && especieDe(m) === "porcino" && !initial) setCrearTernero(false);
            setForm({ ...form, madreId: e.target.value });
          }}
        >
          <option value="">— selecciona —</option>
          {db?.animales
            .filter((a) => a.sexo === "hembra" && a.estado === "activo")
            .map((a) => (
              <option key={a.id} value={a.id}>
                #{a.nroIdentificacion} {a.nombre ?? ""}
              </option>
            ))}
        </select>
      </FormRow>
      <FormRow label="Fecha del parto" required>
        <input
          type="date"
          value={form.fecha.slice(0, 10)}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
        />
      </FormRow>
      {camada && (
        <>
          <FormRow label="Crías nacidas vivas">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={form.nacidosVivos ?? ""}
              onChange={(e) =>
                setForm({ ...form, nacidosVivos: e.target.value === "" ? undefined : Math.max(0, parseInt(e.target.value) || 0) })
              }
            />
          </FormRow>
          <FormRow label="Crías nacidas muertas">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={form.nacidosMuertos ?? ""}
              onChange={(e) =>
                setForm({ ...form, nacidosMuertos: e.target.value === "" ? undefined : Math.max(0, parseInt(e.target.value) || 0) })
              }
            />
          </FormRow>
        </>
      )}
      <FormRow label={camada ? "Sexo (si fue una sola cría)" : "Sexo de la cría"}>
        <select
          value={form.sexoTernero ?? ""}
          onChange={(e) => setForm({ ...form, sexoTernero: (e.target.value || undefined) as Sexo | undefined })}
        >
          <option value="">—</option>
          <option value="hembra">Hembra</option>
          <option value="macho">Macho</option>
        </select>
      </FormRow>
      <FormRow label="Peso al nacer (kg)">
        <input
          type="number"
          step="0.5"
          value={form.pesoTerneroKg ?? ""}
          onChange={(e) =>
            setForm({ ...form, pesoTerneroKg: parseFloat(e.target.value) || undefined })
          }
        />
      </FormRow>
      <FormRow label="Complicaciones">
        <input
          value={form.complicaciones ?? ""}
          onChange={(e) => setForm({ ...form, complicaciones: e.target.value })}
        />
      </FormRow>
      {!initial && (
        <>
          <FormRow label="¿Crear la ficha de la cría?" colspan={2}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={crearTernero}
                onChange={(e) => setCrearTernero(e.target.checked)}
                className="!w-4"
              />
              <span>Sí, crear automáticamente en el módulo Animales</span>
            </label>
          </FormRow>
          {crearTernero && (
            <>
              <FormRow label="Nº de chapeta de la cría" required>
                <input
                  value={nroTernero}
                  onChange={(e) => setNroTernero(e.target.value)}
                  placeholder="011"
                />
              </FormRow>
              <FormRow label="Nombre de la cría">
                <input
                  value={nombreTernero}
                  onChange={(e) => setNombreTernero(e.target.value)}
                />
              </FormRow>
            </>
          )}
        </>
      )}
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
    </form>
  );
}
