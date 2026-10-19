"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDB } from "@/lib/useDB";
import { useAbrirNuevo } from "@/lib/tutorial";
import { updateCollection, uid, nowISO } from "@/lib/storage";
import { fmtCOP, fmtDate, todayISO } from "@/lib/format";
import {
  SISTEMAS,
  TIPOS_REGISTRO,
  edadTextoLote,
  fmtNum,
  indicadores,
  infoSistema,
  type Indicadores,
} from "@/lib/lotes";
import { planActivo } from "@/lib/planSanitario";
import type { Ingreso, Lote, RegistroLote, SistemaLote, TipoRegistroLote } from "@/lib/types";
import Modal from "@/components/Modal";
import FormRow from "@/components/FormRow";
import HeroStat from "@/components/HeroStat";

export default function LotesPage() {
  const { db, ready } = useDB();
  const [vista, setVista] = useState<"activos" | "cerrados">("activos");
  const [nuevo, setNuevo] = useState(false);
  const [editar, setEditar] = useState<Lote | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  useAbrirNuevo(() => setNuevo(true), ready);

  const lotes = useMemo(
    () =>
      (db?.lotes ?? [])
        .filter((l) => l.estado === (vista === "activos" ? "activo" : "cerrado"))
        .sort((a, b) => (a.fechaIngreso < b.fechaIngreso ? 1 : -1)),
    [db, vista]
  );

  const totales = useMemo(() => {
    if (!db) return null;
    const activos = db.lotes.filter((l) => l.estado === "activo");
    let aves = 0;
    let cerdos = 0;
    let huevosHoy = 0;
    for (const l of activos) {
      const ind = indicadores(l, db.registrosLote);
      if (l.especie === "aviar") aves += ind.vivos;
      else cerdos += ind.vivos;
      huevosHoy += ind.huevosHoy ?? 0;
    }
    return { lotes: activos.length, aves, cerdos, huevosHoy };
  }, [db]);

  if (!ready || !db || !totales) return <div className="text-muted">Cargando…</div>;

  const detalle = detalleId ? db.lotes.find((l) => l.id === detalleId) ?? null : null;

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
        <HeroStat label="Lotes activos" value={totales.lotes} tone="forest" />
        <HeroStat label="Aves" value={fmtNum(totales.aves)} tone="citrus" />
        <HeroStat label="Cerdos en lote" value={fmtNum(totales.cerdos)} tone="copper" />
        <HeroStat label="Huevos hoy" value={fmtNum(totales.huevosHoy)} tone="moss" />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            className={"btn " + (vista === "activos" ? "btn-primary" : "btn-ghost")}
            onClick={() => setVista("activos")}
          >
            Activos
          </button>
          <button
            className={"btn " + (vista === "cerrados" ? "btn-primary" : "btn-ghost")}
            onClick={() => setVista("cerrados")}
          >
            Cerrados
          </button>
        </div>
        <button className="btn btn-primary" onClick={() => setNuevo(true)}>
          + Nuevo lote
        </button>
      </div>

      {lotes.length === 0 ? (
        vista === "activos" ? (
          <EmptyLotes onNuevo={() => setNuevo(true)} />
        ) : (
          <div className="card text-center text-muted text-sm py-8">Aún no ha cerrado ningún lote.</div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lotes.map((l) => (
            <LoteCard
              key={l.id}
              lote={l}
              ind={indicadores(l, db.registrosLote)}
              onClick={() => setDetalleId(l.id)}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-muted px-1">
        Aquí van los animales que se manejan por grupo: gallinas ponedoras, pollo de engorde,
        gallinas de campo y cerdos de levante y ceba. Las cerdas y los verracos de cría se
        registran uno por uno en <Link href="/animales" className="underline">Animales</Link>.
      </p>

      <Modal
        open={nuevo || !!editar}
        onClose={() => {
          setNuevo(false);
          setEditar(null);
        }}
        title={editar ? `Editar ${editar.nombre}` : "Nuevo lote"}
        size="lg"
      >
        <LoteForm
          key={editar?.id ?? "nuevo"}
          initial={editar}
          numero={db.lotes.length + 1}
          onSaved={(l) => {
            setNuevo(false);
            setEditar(null);
            setDetalleId(l.id);
          }}
        />
      </Modal>

      <Modal
        open={!!detalle}
        onClose={() => setDetalleId(null)}
        title={detalle ? `${infoSistema(detalle.sistema).emoji} ${detalle.nombre}` : ""}
        eyebrow={detalle ? infoSistema(detalle.sistema).nombre : undefined}
        size="lg"
      >
        {detalle && (
          <LoteDetalle
            lote={detalle}
            onEditar={() => {
              setDetalleId(null);
              setEditar(detalle);
            }}
            onBorrado={() => setDetalleId(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function EmptyLotes({ onNuevo }: { onNuevo: () => void }) {
  return (
    <div className="card py-8 flex flex-col items-center text-center gap-4">
      <div className="text-4xl" aria-hidden>
        🐔 🥚 🐖
      </div>
      <div>
        <h2 className="font-semibold text-lg">Lleve sus gallinas, pollos y cerdos de ceba por lote</h2>
        <p className="text-sm text-muted mt-1 max-w-md">
          Anote cada día los huevos, la mortalidad, el alimento y el peso. RumeApp le calcula la
          postura, la conversión y cuánto le está dejando cada lote.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full max-w-2xl">
        {SISTEMAS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={onNuevo}
            className="rounded-xl border border-rule px-3 py-3 text-left hover:bg-surface-2 transition"
          >
            <div className="text-2xl" aria-hidden>
              {s.emoji}
            </div>
            <div className="text-sm font-semibold mt-1">{s.nombre}</div>
          </button>
        ))}
      </div>
      <button className="btn btn-primary" onClick={onNuevo}>
        + Crear mi primer lote
      </button>
    </div>
  );
}

/** El dato que más importa de cada sistema, para la tarjeta. */
function datoClave(lote: Lote, ind: Indicadores): { label: string; valor: string } {
  switch (lote.sistema) {
    case "ponedoras":
    case "campo":
      return ind.posturaPct != null
        ? { label: "Postura (7 días)", valor: `${fmtNum(ind.posturaPct, 1)} %` }
        : { label: "Huevos hoy", valor: ind.huevosHoy != null ? fmtNum(ind.huevosHoy) : "—" };
    case "engorde":
    case "levante_ceba":
      return { label: "Peso promedio", valor: ind.pesoPromKg != null ? `${fmtNum(ind.pesoPromKg, ind.pesoPromKg < 10 ? 2 : 1)} kg` : "—" };
  }
}

function LoteCard({ lote, ind, onClick }: { lote: Lote; ind: Indicadores; onClick: () => void }) {
  const s = infoSistema(lote.sistema);
  const clave = datoClave(lote, ind);
  const ciclo = s.cicloDias && lote.estado === "activo" ? Math.min(100, (ind.diasEnLote / s.cicloDias) * 100) : null;
  return (
    <button type="button" onClick={onClick} className="card text-left w-full hover:bg-surface-2 transition space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none" aria-hidden>
          {s.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{lote.nombre}</div>
          <div className="text-xs text-muted">
            {s.nombre} · {edadTextoLote(ind.edadDias, lote.sistema)}
            {lote.ubicacion ? ` · ${lote.ubicacion}` : ""}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold tabular-nums">{fmtNum(ind.vivos)}</div>
          <div className="text-[0.65rem] text-muted">de {fmtNum(lote.cantidadInicial)} {s.animales}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Mini label={clave.label} valor={clave.valor} />
        <Mini label="Mortalidad" valor={`${fmtNum(ind.mortalidadPct, 1)} %`} alerta={ind.mortalidadPct >= 5} />
        <Mini
          label={ind.conversion != null ? "Conversión" : "Alimento"}
          valor={ind.conversion != null ? fmtNum(ind.conversion, 2) : `${fmtNum(ind.alimentoKg)} kg`}
        />
      </div>
      {ciclo != null && (
        <div>
          <div className="flex justify-between text-[0.65rem] text-muted mb-1">
            <span>Día {ind.diasEnLote} del ciclo</span>
            <span>~{s.cicloDias} días</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${ciclo}%` }} />
          </div>
        </div>
      )}
    </button>
  );
}

function Mini({ label, valor, alerta }: { label: string; valor: string; alerta?: boolean }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2 py-1.5">
      <div className={"text-sm font-semibold tabular-nums " + (alerta ? "text-danger" : "")}>{valor}</div>
      <div className="text-[0.62rem] text-muted leading-tight">{label}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Crear / editar lote
// ---------------------------------------------------------------------------
function LoteForm({
  initial,
  numero,
  onSaved,
}: {
  initial: Lote | null;
  numero: number;
  onSaved: (l: Lote) => void;
}) {
  const [form, setForm] = useState<Lote>(
    initial ?? {
      id: uid(),
      especie: "aviar",
      sistema: "ponedoras",
      nombre: "",
      fechaIngreso: todayISO(),
      cantidadInicial: 0,
      edadIngresoDias: 0,
      estado: "activo",
      createdAt: nowISO(),
    }
  );
  const s = infoSistema(form.sistema);
  // La edad se escribe en semanas (gallinas) o días (pollos, cerdos).
  const [edad, setEdad] = useState(() =>
    initial ? String(s.edadUnidad === "semanas" ? Math.round(initial.edadIngresoDias / 7) : initial.edadIngresoDias) : ""
  );
  const [error, setError] = useState<string | null>(null);

  function escogerSistema(v: SistemaLote) {
    const nuevo = infoSistema(v);
    setForm({ ...form, sistema: v, especie: nuevo.especie });
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.cantidadInicial || form.cantidadInicial < 1) {
      setError(`Escriba cuántos ${s.animales} entraron al lote.`);
      return;
    }
    const n = Number(edad) || 0;
    const lote: Lote = {
      ...form,
      nombre: form.nombre.trim() || `Lote ${numero} · ${s.nombre}`,
      raza: form.raza?.trim() || undefined,
      ubicacion: form.ubicacion?.trim() || undefined,
      edadIngresoDias: s.edadUnidad === "semanas" ? n * 7 : n,
    };
    updateCollection("lotes", (list) => [...list.filter((l) => l.id !== lote.id), lote]);
    onSaved(lote);
  }

  return (
    <form onSubmit={guardar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {!initial && (
        <div className="md:col-span-2">
          <div className="text-sm font-medium mb-1.5">¿Qué tipo de lote es?</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {SISTEMAS.map((x) => {
              const activo = x.value === form.sistema;
              return (
                <button
                  key={x.value}
                  type="button"
                  onClick={() => escogerSistema(x.value)}
                  className="rounded-xl px-3 py-2.5 text-left transition"
                  style={{
                    background: activo ? "var(--primary-soft)" : "transparent",
                    border: `1.5px solid ${activo ? "var(--primary)" : "var(--rule)"}`,
                  }}
                >
                  <div className="text-2xl leading-none" aria-hidden>
                    {x.emoji}
                  </div>
                  <div className="text-sm font-semibold mt-1">{x.nombre}</div>
                  <div className="text-[0.68rem] text-muted leading-snug mt-0.5">{x.descripcion}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <FormRow label="Nombre del lote" hint="Si lo deja vacío le ponemos uno">
        <input
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          placeholder={`Lote ${numero} · ${s.nombre}`}
        />
      </FormRow>
      <FormRow label="Galpón, corral o caseta">
        <input
          value={form.ubicacion ?? ""}
          onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
          placeholder="Ej. Galpón 1"
        />
      </FormRow>
      <FormRow label={`¿Cuántos ${s.animales} entraron?`} required>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={form.cantidadInicial || ""}
          onChange={(e) => setForm({ ...form, cantidadInicial: Math.max(0, parseInt(e.target.value) || 0) })}
          placeholder="Ej. 200"
        />
      </FormRow>
      <FormRow label="Fecha en que entraron" required>
        <input
          type="date"
          value={form.fechaIngreso}
          max={todayISO()}
          onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })}
        />
      </FormRow>
      <FormRow
        label={`Edad al llegar (${s.edadUnidad === "semanas" ? "semanas" : "días"})`}
        hint={
          form.sistema === "engorde"
            ? "Pollitos de un día: escriba 1"
            : form.sistema === "levante_ceba"
              ? "Lechones recién destetados: unos 28 días"
              : "Pollitas de levante: unas 16 semanas"
        }
      >
        <input type="number" min={0} inputMode="numeric" value={edad} onChange={(e) => setEdad(e.target.value)} />
      </FormRow>
      <FormRow label="Raza o línea">
        <input
          value={form.raza ?? ""}
          onChange={(e) => setForm({ ...form, raza: e.target.value })}
          list={`razas-${form.sistema}`}
          placeholder={`Ej. ${s.razas[0]}`}
        />
        <datalist id={`razas-${form.sistema}`}>
          {s.razas.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </FormRow>
      {(form.sistema === "engorde" || form.sistema === "levante_ceba") && (
        <FormRow label="Peso promedio al llegar (kg)" hint="Para calcular la ganancia diaria y la conversión">
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={form.pesoIngresoKg ?? ""}
            onChange={(e) =>
              setForm({ ...form, pesoIngresoKg: e.target.value === "" ? undefined : Math.max(0, parseFloat(e.target.value) || 0) })
            }
            placeholder={form.sistema === "engorde" ? "0,04" : "7"}
          />
        </FormRow>
      )}
      <FormRow label="Notas" colspan={2}>
        <input value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
      </FormRow>

      {error && <div className="md:col-span-2 text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">{error}</div>}
      <button type="submit" className="btn btn-primary md:col-span-2 justify-center">
        {initial ? "Guardar cambios" : "Crear lote"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
//  Detalle del lote: indicadores, botones del día y registros
// ---------------------------------------------------------------------------
function LoteDetalle({ lote, onEditar, onBorrado }: { lote: Lote; onEditar: () => void; onBorrado: () => void }) {
  const { db } = useDB();
  const [registrando, setRegistrando] = useState<TipoRegistroLote | null>(null);
  if (!db) return null;
  const s = infoSistema(lote.sistema);
  const ind = indicadores(lote, db.registrosLote);
  const regs = db.registrosLote
    .filter((r) => r.loteId === lote.id)
    .sort((a, b) => (a.fecha === b.fecha ? (a.createdAt < b.createdAt ? 1 : -1) : a.fecha < b.fecha ? 1 : -1));
  const activo = lote.estado === "activo";
  const sinPlan = activo && !planActivo(db, lote.especie);

  const cifras: { label: string; valor: string; ayuda?: string }[] = [
    { label: `${s.animales[0].toUpperCase()}${s.animales.slice(1)} vivos`, valor: `${fmtNum(ind.vivos)} de ${fmtNum(lote.cantidadInicial)}` },
    { label: "Edad", valor: edadTextoLote(ind.edadDias, lote.sistema) },
    { label: "Mortalidad", valor: `${fmtNum(ind.muertos)} · ${fmtNum(ind.mortalidadPct, 1)} %` },
  ];
  if (s.registros.includes("huevos")) {
    cifras.push(
      { label: "Huevos hoy", valor: ind.huevosHoy != null ? fmtNum(ind.huevosHoy) : "Sin anotar" },
      {
        label: "Postura (7 días)",
        valor: ind.posturaPct != null ? `${fmtNum(ind.posturaPct, 1)} %` : "—",
        ayuda: "Huevos por día ÷ gallinas vivas",
      },
      { label: "Huevos en 7 días", valor: `${fmtNum(ind.huevosSemana)} (${fmtNum(ind.huevosSemana / 30, 1)} cubetas)` }
    );
  }
  if (s.registros.includes("peso")) {
    cifras.push({
      label: "Peso promedio",
      valor: ind.pesoPromKg != null ? `${fmtNum(ind.pesoPromKg, ind.pesoPromKg < 10 ? 2 : 1)} kg` : "Sin pesar",
      ayuda: ind.pesoFecha ? `Pesados el ${fmtDate(ind.pesoFecha)}` : undefined,
    });
  }
  if (lote.sistema === "engorde" || lote.sistema === "levante_ceba") {
    cifras.push(
      {
        label: "Ganancia diaria",
        valor: ind.gananciaGrDia != null ? `${fmtNum(ind.gananciaGrDia)} g/día` : "—",
        ayuda: lote.pesoIngresoKg == null ? "Ponga el peso al llegar en Editar" : undefined,
      },
      {
        label: "Conversión",
        valor: ind.conversion != null ? fmtNum(ind.conversion, 2) : "—",
        ayuda: "Kg de alimento por kg de carne",
      }
    );
  }
  cifras.push(
    {
      label: "Alimento",
      valor: `${fmtNum(ind.alimentoKg)} kg`,
      ayuda: ind.alimentoGrDia != null ? `${fmtNum(ind.alimentoGrDia)} g por animal al día` : undefined,
    },
    { label: "Ventas", valor: fmtCOP(ind.ventas) },
    { label: "Costo de alimento", valor: fmtCOP(ind.costoAlimento) }
  );

  function cerrar() {
    if (!confirm(`¿Cerrar ${lote.nombre}? Queda guardado en "Cerrados" con todos sus datos.`)) return;
    updateCollection("lotes", (list) =>
      list.map((l) => (l.id === lote.id ? { ...l, estado: "cerrado", fechaCierre: todayISO() } : l))
    );
    onBorrado();
  }

  function reabrir() {
    updateCollection("lotes", (list) =>
      list.map((l) => (l.id === lote.id ? { ...l, estado: "activo", fechaCierre: undefined } : l))
    );
  }

  function eliminar() {
    if (!confirm(`¿Eliminar ${lote.nombre} y todos sus registros? Esto no se puede deshacer.`)) return;
    updateCollection("registrosLote", (list) => list.filter((r) => r.loteId !== lote.id));
    updateCollection("lotes", (list) => list.filter((l) => l.id !== lote.id));
    onBorrado();
  }

  function borrarRegistro(r: RegistroLote) {
    if (!confirm("¿Borrar este registro?")) return;
    updateCollection("registrosLote", (list) => list.filter((x) => x.id !== r.id));
  }

  return (
    <div className="space-y-5">
      {activo && (
        <div>
          <div className="eyebrow mb-2">Anotar de hoy</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {s.registros.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setRegistrando(t)}
                className={
                  "rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-surface-2 " +
                  (t === s.registros[0] ? "border-primary bg-primary-soft/40" : "border-rule")
                }
              >
                <span aria-hidden className="mr-1.5">
                  {TIPOS_REGISTRO[t].emoji}
                </span>
                {t === "venta" ? `Vendí ${s.animales}` : TIPOS_REGISTRO[t].boton}
              </button>
            ))}
          </div>
        </div>
      )}

      {registrando && (
        <RegistroForm
          lote={lote}
          tipo={registrando}
          vivos={ind.vivos}
          onListo={() => setRegistrando(null)}
        />
      )}

      {sinPlan && (
        <Link
          href="/sanidad?plan=1"
          className="flex items-center gap-3 rounded-xl border border-primary px-3 py-2.5 hover:bg-surface-2 transition"
        >
          <span className="text-2xl" aria-hidden>
            🩺
          </span>
          <span className="flex-1 text-sm">
            <b>Active el plan sanitario de sus {lote.especie === "aviar" ? "aves" : "cerdos"}</b>
            <span className="block text-xs text-muted">Vacunas, purgas y limpieza, con aviso el día que toca.</span>
          </span>
          <span className="text-primary" aria-hidden>
            →
          </span>
        </Link>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {cifras.map((c) => (
          <div key={c.label} className="rounded-xl bg-surface-2 px-3 py-2.5">
            <div className="text-[0.68rem] text-muted">{c.label}</div>
            <div className="font-semibold tabular-nums">{c.valor}</div>
            {c.ayuda && <div className="text-[0.62rem] text-subtle mt-0.5 leading-tight">{c.ayuda}</div>}
          </div>
        ))}
      </div>

      <div>
        <div className="eyebrow mb-2">Registros</div>
        {regs.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay registros. Empiece por lo de hoy.</p>
        ) : (
          <ul className="divide-y divide-rule rounded-xl border border-rule">
            {regs.slice(0, 60).map((r) => {
              const t = TIPOS_REGISTRO[r.tipo];
              return (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2">
                  <span aria-hidden>{t.emoji}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm">
                      {r.tipo === "venta" ? `Venta de ${s.animales}` : t.boton.replace(" de hoy", "")}
                      {r.tipo !== "otro" || r.cantidad ? (
                        <b className="ml-1.5 tabular-nums">
                          {fmtNum(Number(r.cantidad), r.tipo === "peso" ? 2 : 0)} {r.tipo === "mortalidad" || r.tipo === "venta" ? s.animales : t.unidad}
                        </b>
                      ) : null}
                      {r.valor ? <span className="text-muted ml-1.5">· {fmtCOP(Number(r.valor))}</span> : null}
                    </span>
                    <span className="block text-xs text-muted truncate">
                      {fmtDate(r.fecha)}
                      {r.notas ? ` · ${r.notas}` : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="text-xs text-muted hover:text-danger"
                    onClick={() => borrarRegistro(r)}
                    aria-label="Borrar registro"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-1 border-t border-rule">
        <button type="button" className="btn btn-ghost" onClick={onEditar}>
          Editar lote
        </button>
        {activo ? (
          <button type="button" className="btn btn-ghost" onClick={cerrar}>
            Cerrar lote
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={reabrir}>
            Volver a abrir
          </button>
        )}
        <button type="button" className="btn btn-ghost text-danger ml-auto" onClick={eliminar}>
          Eliminar
        </button>
      </div>
    </div>
  );
}

function RegistroForm({
  lote,
  tipo,
  vivos,
  onListo,
}: {
  lote: Lote;
  tipo: TipoRegistroLote;
  vivos: number;
  onListo: () => void;
}) {
  const t = TIPOS_REGISTRO[tipo];
  const s = infoSistema(lote.sistema);
  const [fecha, setFecha] = useState(todayISO());
  const [cantidad, setCantidad] = useState("");
  const [enCubetas, setEnCubetas] = useState(false);
  const [valor, setValor] = useState("");
  const [notas, setNotas] = useState("");
  const [aIngresos, setAIngresos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const esHuevos = tipo === "huevos" || tipo === "venta_huevos";

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let n = parseFloat(cantidad.replace(",", ".")) || 0;
    if (esHuevos && enCubetas) n = n * 30;
    if (tipo !== "otro" && n <= 0) {
      setError("Escriba la cantidad.");
      return;
    }
    if ((tipo === "mortalidad" || tipo === "venta") && n > vivos) {
      setError(`En el lote quedan ${vivos} ${s.animales}.`);
      return;
    }
    const v = valor ? Math.max(0, parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0) : undefined;
    const reg: RegistroLote = {
      id: uid(),
      loteId: lote.id,
      fecha,
      tipo,
      cantidad: n,
      valor: v || undefined,
      notas: notas.trim() || undefined,
      createdAt: nowISO(),
    };
    updateCollection("registrosLote", (list) => [...list, reg]);
    // Las ventas también quedan en Ingresos (para el balance de la finca).
    if ((tipo === "venta" || tipo === "venta_huevos") && v && aIngresos) {
      const ingreso: Ingreso = {
        id: uid(),
        fecha,
        tipo: tipo === "venta" ? "venta_animal" : "otros",
        concepto:
          tipo === "venta"
            ? `Venta de ${fmtNum(n)} ${s.animales} · ${lote.nombre}`
            : `Venta de ${fmtNum(n)} huevos · ${lote.nombre}`,
        monto: v,
        notas: notas.trim() || undefined,
        createdAt: nowISO(),
      };
      updateCollection("ingresos", (list) => [...list, ingreso]);
    }
    onListo();
  }

  return (
    <form onSubmit={guardar} className="rounded-xl border border-primary p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="md:col-span-2 font-semibold">
        <span aria-hidden className="mr-1.5">
          {t.emoji}
        </span>
        {tipo === "venta" ? `Vendí ${s.animales}` : t.boton}
      </div>
      <FormRow label={tipo === "mortalidad" ? `¿Cuántos ${s.animales} murieron?` : tipo === "venta" ? `¿Cuántos ${s.animales} vendió?` : t.cantidad} required={tipo !== "otro"}>
        <div className="flex gap-2">
          <input
            autoFocus
            type="number"
            min={0}
            step={tipo === "peso" || tipo === "alimento" ? "0.01" : "1"}
            inputMode="decimal"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
          {esHuevos && (
            <select value={enCubetas ? "c" : "h"} onChange={(e) => setEnCubetas(e.target.value === "c")} className="!w-auto">
              <option value="h">huevos</option>
              <option value="c">cubetas (30)</option>
            </select>
          )}
        </div>
      </FormRow>
      <FormRow label="Fecha">
        <input type="date" value={fecha} max={todayISO()} onChange={(e) => setFecha(e.target.value)} />
      </FormRow>
      {t.pideValor && (
        <FormRow label={t.valorLabel ?? "Valor"}>
          <input
            inputMode="numeric"
            value={valor}
            onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
            placeholder="$"
          />
        </FormRow>
      )}
      <FormRow label="Nota (opcional)">
        <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder={tipo === "mortalidad" ? "Causa, si la sabe" : ""} />
      </FormRow>
      {(tipo === "venta" || tipo === "venta_huevos") && (
        <label className="md:col-span-2 flex items-center gap-2 text-sm">
          <input type="checkbox" className="w-4 h-4" checked={aIngresos} onChange={(e) => setAIngresos(e.target.checked)} />
          Anotarla también en Ingresos de la finca
        </label>
      )}
      {error && <div className="md:col-span-2 text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">{error}</div>}
      <div className="md:col-span-2 flex gap-2">
        <button type="submit" className="btn btn-primary flex-1 justify-center">
          Guardar
        </button>
        <button type="button" className="btn btn-ghost" onClick={onListo}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
