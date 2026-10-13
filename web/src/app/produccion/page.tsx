"use client";

import { useMemo, useState } from "react";
import { useDB } from "@/lib/useDB";
import { useAbrirNuevo } from "@/lib/tutorial";
import { updateCollection, uid, nowISO } from "@/lib/storage";
import { fmtDate, fmtNumber, todayISO, ymdLocal } from "@/lib/format";
import { ProduccionLeche } from "@/lib/types";
import Modal from "@/components/Modal";
import FormRow from "@/components/FormRow";
import AreaChart from "@/components/AreaChart";
import ExportarPDFButton from "@/components/ExportarPDFButton";

export default function ProduccionPage() {
  const { db, ready } = useDB();
  const [openLec, setOpenLec] = useState(false);
  const [editLec, setEditLec] = useState<ProduccionLeche | null>(null);
  const [modeLec, setModeLec] = useState<"view" | "edit">("view");
  const [filtroAnimal, setFiltroAnimal] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // Desde el correo del día 2 (?nuevo=1): abrir el formulario.
  useAbrirNuevo(() => {
    setEditLec(null);
    setModeLec("edit");
    setOpenLec(true);
  }, ready);

  const leche = useMemo(() => {
    if (!db) return [];
    return [...db.leche]
      .filter((l) => (filtroAnimal ? l.animalId === filtroAnimal : true))
      .filter((l) => (desde ? l.fecha >= desde : true))
      .filter((l) => (hasta ? l.fecha <= hasta : true))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [db, filtroAnimal, desde, hasta]);

  const filtrosActivos = !!filtroAnimal || !!desde || !!hasta;

  function limpiarFiltros() {
    setFiltroAnimal("");
    setDesde("");
    setHasta("");
  }

  // Últimos 7 días agrupados
  const leche7 = useMemo(() => {
    const map = new Map<string, number>();
    const desde = new Date();
    desde.setDate(desde.getDate() - 6);
    leche.forEach((l) => {
      if (new Date(l.fecha) < desde) return;
      const key = l.fecha.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + l.litrosManana + l.litrosTarde);
    });
    // completar días faltantes
    const out: { fecha: string; litros: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = ymdLocal(d);
      out.push({ fecha: key, litros: map.get(key) ?? 0 });
    }
    return out;
  }, [leche]);

  if (!ready) return <div className="text-muted">Cargando…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-muted">
          {leche.length} registro{leche.length === 1 ? "" : "s"} de ordeño
        </div>
        <div className="flex gap-2">
          <ExportarPDFButton
            titulo="Producción de leche"
            columnas={[
              { header: "Fecha", value: (l: ProduccionLeche) => fmtDate(l.fecha) },
              { header: "Animal", value: (l: ProduccionLeche) => db?.animales.find((a) => a.id === l.animalId)?.nroIdentificacion ?? "—" },
              { header: "Mañana (L)", value: (l: ProduccionLeche) => fmtNumber(l.litrosManana) },
              { header: "Tarde (L)", value: (l: ProduccionLeche) => fmtNumber(l.litrosTarde) },
              { header: "Total (L)", value: (l: ProduccionLeche) => fmtNumber(l.litrosManana + l.litrosTarde) },
            ]}
            filas={leche}
            resumen={[{ label: "Total litros", valor: fmtNumber(leche.reduce((s, l) => s + l.litrosManana + l.litrosTarde, 0)) }]}
            nombreArchivo="produccion-leche"
          />
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditLec(null);
              setModeLec("edit");
              setOpenLec(true);
            }}
          >
            + Registrar ordeño
          </button>
        </div>
      </div>

      <div className="card card-tight">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
          <div className="md:col-span-2">
            <div className="eyebrow mb-1">Vaca</div>
            <select value={filtroAnimal} onChange={(e) => setFiltroAnimal(e.target.value)}>
              <option value="">Todas</option>
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
              {leche.length} registro{leche.length === 1 ? "" : "s"}
            </span>
            <button className="text-xs text-primary hover:underline font-medium" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      <div className="card">
            <div className="card-head">
              <div>
                <div className="text-[0.62rem] font-mono uppercase tracking-widest text-muted mb-1">Ordeño</div>
                <h2 className="text-lg font-semibold tracking-tight">Producción · últimos 7 días</h2>
              </div>
              <div className="text-right">
                <div className="text-[0.62rem] font-mono uppercase tracking-widest text-muted">Total semana</div>
                <div className="num text-3xl text-primary leading-none mt-1">
                  {fmtNumber(leche7.reduce((s, d) => s + d.litros, 0), 0)} <span className="text-base text-muted">L</span>
                </div>
              </div>
            </div>
            <AreaChart
              data={leche7.map((d) => ({
                label: new Date(d.fecha).toLocaleDateString("es-CO", { weekday: "short" }).slice(0, 3),
                value: d.litros,
              }))}
              color="var(--primary)"
              unit="L"
              height={200}
            />
          </div>

          <div className="card p-0 overflow-x-auto">
            <table
              className="table"
              style={{ ["--cols" as string]: "10rem minmax(10rem, 1.5fr) 8rem 8rem 8rem 7rem" }}
            >
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Vaca</th>
                  <th className="text-right">Mañana</th>
                  <th className="text-right">Tarde</th>
                  <th className="text-right">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leche.slice(0, 50).map((l) => {
                  const animal = db!.animales.find((a) => a.id === l.animalId);
                  const total = l.litrosManana + l.litrosTarde;
                  return (
                    <tr
                      key={l.id}
                      onClick={() => {
                        setEditLec(l);
                        setModeLec("view");
                        setOpenLec(true);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{fmtDate(l.fecha)}</td>
                      <td>
                        {animal?.nombre ?? "—"}{" "}
                        <span className="font-mono text-xs text-muted">
                          #{animal?.nroIdentificacion}
                        </span>
                      </td>
                      <td className="text-right font-mono tabular-nums">
                        {fmtNumber(l.litrosManana, 1)}
                      </td>
                      <td className="text-right font-mono tabular-nums">
                        {fmtNumber(l.litrosTarde, 1)}
                      </td>
                      <td className="text-right font-mono tabular-nums font-semibold">
                        {fmtNumber(total, 1)}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <button
                          className="text-xs text-muted hover:text-fg hover:underline mr-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditLec(l);
                            setModeLec("view");
                            setOpenLec(true);
                          }}
                        >
                          ver
                        </button>
                        <button
                          className="text-xs text-accent hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditLec(l);
                            setModeLec("edit");
                            setOpenLec(true);
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

      <Modal
        open={openLec}
        onClose={() => setOpenLec(false)}
        title={editLec ? (modeLec === "view" ? "Detalle de ordeño" : "Editar ordeño") : "Registrar ordeño"}
      >
        {editLec && modeLec === "view" && (
          <div className="flex justify-end mb-3">
            <button
              className="btn btn-primary"
              onClick={() => setModeLec("edit")}
              style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}
            >
              Editar
            </button>
          </div>
        )}
        <LecheForm
          initial={editLec}
          readOnly={!!editLec && modeLec === "view"}
          onSaved={() => setOpenLec(false)}
          onCancel={() => setOpenLec(false)}
        />
      </Modal>
    </div>
  );
}

function LecheForm({
  initial,
  readOnly = false,
  onSaved,
  onCancel,
}: {
  initial: ProduccionLeche | null;
  readOnly?: boolean;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { db } = useDB();
  const [form, setForm] = useState<ProduccionLeche>(
    initial ?? {
      id: uid(),
      animalId: "",
      fecha: todayISO(),
      litrosManana: 0,
      litrosTarde: 0,
      createdAt: nowISO(),
    }
  );

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.animalId) return alert("Selecciona la vaca");
    updateCollection("leche", (list) => [
      ...list.filter((l) => l.id !== form.id),
      form,
    ]);
    onSaved();
  }

  function remove() {
    if (!initial) return;
    if (!confirm("¿Eliminar este registro?")) return;
    updateCollection("leche", (list) => list.filter((l) => l.id !== initial.id));
    onSaved();
  }

  return (
    <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <fieldset disabled={readOnly} className="contents">
      <FormRow label="Vaca" required colspan={2}>
        <select
          value={form.animalId}
          onChange={(e) => setForm({ ...form, animalId: e.target.value })}
        >
          <option value="">— selecciona —</option>
          {db?.animales
            .filter((a) => a.sexo === "hembra" && a.categoria === "vaca" && a.estado === "activo")
            .map((a) => (
              <option key={a.id} value={a.id}>
                #{a.nroIdentificacion} {a.nombre ?? ""}
              </option>
            ))}
        </select>
      </FormRow>
      <FormRow label="Fecha" required colspan={2}>
        <input
          type="date"
          value={form.fecha.slice(0, 10)}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
        />
      </FormRow>
      <FormRow label="Litros mañana" required>
        <input
          type="number"
          step="0.1"
          value={form.litrosManana}
          onChange={(e) => setForm({ ...form, litrosManana: parseFloat(e.target.value) || 0 })}
        />
      </FormRow>
      <FormRow label="Litros tarde" required>
        <input
          type="number"
          step="0.1"
          value={form.litrosTarde}
          onChange={(e) => setForm({ ...form, litrosTarde: parseFloat(e.target.value) || 0 })}
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

