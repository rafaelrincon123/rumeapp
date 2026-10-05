"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDB } from "@/lib/useDB";
import { hrefNuevo, useAbrirNuevo } from "@/lib/tutorial";
import { updateCollection, uid, nowISO } from "@/lib/storage";
import { edadTexto, fmtDate, fmtCOP, fmtNumber, diasHasta, todayISO } from "@/lib/format";
import {
  Animal,
  CATEGORIAS_ANIMAL,
  CategoriaAnimal,
  EstadoAnimal,
  Sexo,
  TIPOS_SANIDAD,
  DBState,
} from "@/lib/types";
import Modal from "@/components/Modal";
import { IconCheck, IconCow, IconHealth, IconMoney } from "@/components/icons";
import RegistroVarios from "@/components/RegistroVarios";
import {
  EDADES,
  SEXO_DE_CATEGORIA,
  TIPOS_BASICO,
  Guardado,
  PlantillaAnimal,
  chapetaSiguiente,
  fechaDesdeEdad,
  siguienteNumero,
} from "@/lib/animalesForm";
import FormRow from "@/components/FormRow";
import PhotoInput from "@/components/PhotoInput";
import HeroStat from "@/components/HeroStat";
import PlanUsageBanner from "@/components/PlanUsageBanner";
import ExportarPDFButton from "@/components/ExportarPDFButton";
import { PLAN_LIMITS, planLabel, planEfectivo } from "@/lib/plans";
import { useFincaActiva } from "@/lib/useFincaActiva";

const ESTADOS: { value: EstadoAnimal; label: string }[] = [
  { value: "activo", label: "Activo" },
  { value: "vendido", label: "Vendido" },
  { value: "muerto", label: "Muerto" },
  { value: "descartado", label: "Descartado" },
];

export default function AnimalesPage() {
  const { db, ready } = useDB();
  const [q, setQ] = useState("");
  const [filtroCat, setFiltroCat] = useState<CategoriaAnimal | "">("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoAnimal | "">("activo");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Animal | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [detailAnimal, setDetailAnimal] = useState<Animal | null>(null);
  // Animal recién registrado: en vez de cerrar, el modal felicita y ofrece
  // el siguiente paso. `formKey` reinicia el formulario para "registrar otro".
  const [guardado, setGuardado] = useState<Guardado | null>(null);
  const [formKey, setFormKey] = useState(0);
  // "uno" = formulario de un animal; "varios" = registrar varios a la vez.
  const [vista, setVista] = useState<"uno" | "varios">("uno");
  const [plantilla, setPlantilla] = useState<PlantillaAnimal | undefined>(undefined);
  // Desde el tutorial de primeros pasos: /animales?nuevo=1 abre el formulario
  // (con &modo=varios, el registro de varios).
  useAbrirNuevo((params) => {
    abrirNuevo(params.get("modo") === "varios" ? "varios" : "uno");
  }, ready);

  function abrirNuevo(v: "uno" | "varios", p?: PlantillaAnimal) {
    setEdit(null);
    setGuardado(null);
    setPlantilla(p);
    setVista(v);
    setFormKey((k) => k + 1);
    setOpen(true);
  }

  function abrirEdicion(a: Animal) {
    setEdit(a);
    setGuardado(null);
    setPlantilla(undefined);
    setFormKey((k) => k + 1);
    setOpen(true);
  }

  function cerrarForm() {
    setOpen(false);
    setGuardado(null);
    setPlantilla(undefined);
  }

  const filtered = useMemo(() => {
    if (!db) return [];
    const term = q.trim().toLowerCase();
    return db.animales
      .filter((a) => (filtroEstado ? a.estado === filtroEstado : true))
      .filter((a) => (filtroCat ? a.categoria === filtroCat : true))
      .filter((a) =>
        term
          ? a.nroIdentificacion.toLowerCase().includes(term) ||
            (a.nombre?.toLowerCase().includes(term) ?? false) ||
            a.raza.toLowerCase().includes(term)
          : true
      )
      .sort((a, b) => a.nroIdentificacion.localeCompare(b.nroIdentificacion));
  }, [db, q, filtroCat, filtroEstado]);

  const stats = useMemo(() => {
    if (!db) return null;
    const activos = db.animales.filter((a) => a.estado === "activo");
    const vacas = activos.filter((a) => a.categoria === "vaca").length;
    const crias = activos.filter(
      (a) => a.categoria === "ternero" || a.categoria === "ternera"
    ).length;
    const machos = activos.filter(
      (a) => a.categoria === "toro" || a.categoria === "novillo"
    ).length;
    return { total: activos.length, vacas, crias, machos };
  }, [db]);

  if (!ready || !stats) return <div className="text-muted">Cargando…</div>;

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
        <HeroStat label="Total activos" value={stats.total} tone="forest" />
        <HeroStat label="Vacas" value={stats.vacas} tone="moss" />
        <HeroStat label="Crías" value={stats.crias} tone="citrus" />
        <HeroStat label="Machos" value={stats.machos} tone="copper" />
      </section>

      <PlanUsageBanner resource="animales" used={db?.animales.length ?? 0} />


      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="search"
            placeholder="Buscar por número, nombre o raza"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full md:w-72"
          />
          <select
            value={filtroCat}
            onChange={(e) => setFiltroCat(e.target.value as CategoriaAnimal | "")}
            className="w-auto"
          >
            <option value="">Todas categorías</option>
            {CATEGORIAS_ANIMAL.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as EstadoAnimal | "")}
            className="w-auto"
          >
            <option value="">Todos estados</option>
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <ExportarPDFButton
            titulo="Animales"
            subtitulo={`${filtered.length} animal${filtered.length === 1 ? "" : "es"} · filtro: ${filtroEstado || "todos"}${filtroCat ? ` · ${filtroCat}` : ""}`}
            columnas={[
              { header: "N°", value: (a: Animal) => a.nroIdentificacion },
              { header: "Nombre", value: (a: Animal) => a.nombre ?? "—" },
              { header: "Sexo", value: (a: Animal) => (a.sexo === "hembra" ? "Hembra" : "Macho") },
              { header: "Raza", value: (a: Animal) => a.raza },
              { header: "Categoría", value: (a: Animal) => CATEGORIAS_ANIMAL.find((c) => c.value === a.categoria)?.label ?? a.categoria },
              { header: "Edad", value: (a: Animal) => edadTexto(a.fechaNacimiento) },
              { header: "Estado", value: (a: Animal) => ESTADOS.find((e) => e.value === a.estado)?.label ?? a.estado },
              { header: "Potrero", value: (a: Animal) => db?.potreros.find((p) => p.id === a.potreroId)?.nombre ?? "—" },
              { header: "Dueño", value: (a: Animal) => db?.propietarios.find((p) => p.id === a.propietarioId)?.nombre ?? "—" },
            ]}
            filas={filtered}
            nombreArchivo="animales"
          />
          <button className="btn" onClick={() => abrirNuevo("varios")}>
            Varios a la vez
          </button>
          <button className="btn btn-primary" onClick={() => abrirNuevo("uno")}>
            + Nuevo animal
          </button>
        </div>
      </div>

      {/* Desktop: table */}
      <div className="card p-0 overflow-x-auto hidden md:block">
        <table
          className="table"
          style={{ ["--cols" as string]: "6rem minmax(10rem, 1.5fr) 5rem 8rem 6rem minmax(10rem, 1.2fr) 8rem 9rem 8rem 8rem" }}
        >
          <thead>
            <tr>
              <th>Nº</th>
              <th>Nombre</th>
              <th>Sexo</th>
              <th>Categoría</th>
              <th>Edad</th>
              <th>Padres</th>
              <th>Potrero</th>
              <th>Propietario</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="row-full text-muted py-8">
                  Sin resultados con estos filtros
                </td>
              </tr>
            ) : (
              filtered.map((a) => {
                const potrero = db!.potreros.find((p) => p.id === a.potreroId);
                const propietario = db!.propietarios.find((p) => p.id === a.propietarioId);
                const madre = a.madreId ? db!.animales.find((x) => x.id === a.madreId) : null;
                const padre = a.padreId ? db!.animales.find((x) => x.id === a.padreId) : null;
                const madreLabel = madre ? madre.nombre : a.madreNombre;
                const padreLabel = padre ? padre.nombre : a.padreNombre;
                return (
                  <tr key={a.id}>
                    <td className="font-mono text-xs">{a.nroIdentificacion}</td>
                    <td className="font-medium">{a.nombre ?? "—"}</td>
                    <td>{a.sexo === "hembra" ? "♀" : "♂"}</td>
                    <td>
                      <span className="chip">
                        {CATEGORIAS_ANIMAL.find((c) => c.value === a.categoria)?.label}
                      </span>
                    </td>
                    <td className="text-muted">
                      {edadTexto(a.fechaNacimiento)}
                      {a.fechaNacimientoAprox ? <span className="text-subtle text-xs"> ~</span> : null}
                    </td>
                    <td className="text-xs text-muted">
                      {madreLabel || padreLabel
                        ? `${madreLabel ?? "—"} × ${padreLabel ?? "—"}`
                        : "—"}
                    </td>
                    <td>{potrero?.nombre ?? "—"}</td>
                    <td>
                      {propietario ? (
                        <span className="chip primary" style={{ fontSize: "0.65rem" }}>
                          {propietario.nombre}
                        </span>
                      ) : (
                        <span className="text-muted text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <span className={"chip " + (a.estado === "activo" ? "success" : "danger")}>
                        {a.estado}
                      </span>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <button
                        className="text-xs text-primary hover:underline font-medium mr-3"
                        onClick={() => {
                          setDetailAnimal(a);
                          setOpenDetail(true);
                        }}
                      >
                        ver
                      </button>
                      <button
                        className="text-xs text-accent hover:underline font-medium"
                        onClick={() => {
                          abrirEdicion(a);
                        }}
                      >
                        editar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 ? (
          <div className="card text-center text-muted text-sm py-8">
            Sin resultados con estos filtros
          </div>
        ) : (
          filtered.map((a) => {
            const potrero = db!.potreros.find((p) => p.id === a.potreroId);
            const propietario = db!.propietarios.find((p) => p.id === a.propietarioId);
            const madre = a.madreId ? db!.animales.find((x) => x.id === a.madreId) : null;
            const padre = a.padreId ? db!.animales.find((x) => x.id === a.padreId) : null;
            const madreLabel = madre ? madre.nombre : a.madreNombre;
            const padreLabel = padre ? padre.nombre : a.padreNombre;
            const parents = madreLabel || padreLabel ? `${madreLabel ?? "—"} × ${padreLabel ?? "—"}` : null;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setDetailAnimal(a);
                  setOpenDetail(true);
                }}
                className="card w-full text-left flex items-center gap-3 !py-3 !px-3"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-mono font-semibold shrink-0"
                  style={{
                    background: a.sexo === "hembra" ? "var(--primary-soft)" : "var(--accent-soft)",
                    color: a.sexo === "hembra" ? "var(--primary)" : "var(--accent)",
                  }}
                >
                  {a.nroIdentificacion}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="font-semibold text-fg truncate">
                      {a.nombre ?? "Sin nombre"}
                    </div>
                    <span className="text-muted text-sm">
                      {a.sexo === "hembra" ? "♀" : "♂"}
                    </span>
                  </div>
                  <div className="text-xs text-muted mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                    <span>{CATEGORIAS_ANIMAL.find((c) => c.value === a.categoria)?.label}</span>
                    <span>·</span>
                    <span>{edadTexto(a.fechaNacimiento)}{a.fechaNacimientoAprox ? " ~" : ""}</span>
                    {potrero && (
                      <>
                        <span>·</span>
                        <span>{potrero.nombre}</span>
                      </>
                    )}
                  </div>
                  {parents && (
                    <div className="text-[0.7rem] text-subtle mt-0.5 truncate">
                      {parents}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {propietario && (
                    <span className="chip primary" style={{ fontSize: "0.6rem", padding: "0.1rem 0.5rem" }}>
                      {propietario.nombre}
                    </span>
                  )}
                  {a.estado !== "activo" && (
                    <span className="chip danger" style={{ fontSize: "0.6rem", padding: "0.1rem 0.5rem" }}>
                      {a.estado}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      <Modal
        open={open}
        onClose={cerrarForm}
        title={
          guardado
            ? "¡Listo!"
            : edit
              ? `Editar animal #${edit.nroIdentificacion}`
              : vista === "varios"
                ? "Varios animales a la vez"
                : "Nuevo animal"
        }
        size={!guardado && !edit && vista === "varios" ? "lg" : "md"}
      >
        {guardado ? (
          <Felicitacion
            guardado={guardado}
            onOtro={() => abrirNuevo("uno", guardado.plantilla)}
            onVarios={() => abrirNuevo("varios")}
            onCerrar={cerrarForm}
          />
        ) : !edit && vista === "varios" ? (
          <RegistroVarios
            key={formKey}
            onSaved={setGuardado}
            onCancel={cerrarForm}
            onUno={() => abrirNuevo("uno")}
          />
        ) : (
          <AnimalForm
            key={formKey}
            initial={edit}
            plantilla={plantilla}
            onSaved={(g) => (g ? setGuardado(g) : cerrarForm())}
            onCancel={cerrarForm}
            onVarios={edit ? undefined : () => abrirNuevo("varios")}
          />
        )}
      </Modal>

      <Modal
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        title={
          detailAnimal
            ? `${detailAnimal.nombre ?? "Animal"} · #${detailAnimal.nroIdentificacion}`
            : ""
        }
        eyebrow="Hoja de vida"
        size="lg"
      >
        {detailAnimal && db && (
          <AnimalDetail
            animal={detailAnimal}
            db={db}
            onEdit={() => {
              setOpenDetail(false);
              abrirEdicion(detailAnimal);
            }}
            onClose={() => setOpenDetail(false)}
          />
        )}
      </Modal>
    </div>
  );
}

function AnimalDetail({
  animal,
  db,
  onEdit,
  onClose,
}: {
  animal: Animal;
  db: DBState;
  onEdit: () => void;
  onClose: () => void;
}) {
  const potrero = db.potreros.find((p) => p.id === animal.potreroId);
  const propietario = db.propietarios.find((p) => p.id === animal.propietarioId);
  const madre = animal.madreId ? db.animales.find((x) => x.id === animal.madreId) : null;
  const padre = animal.padreId ? db.animales.find((x) => x.id === animal.padreId) : null;
  const madreLabel = madre
    ? `#${madre.nroIdentificacion} ${madre.nombre ?? ""}`
    : animal.madreNombre;
  const padreLabel = padre
    ? `#${padre.nroIdentificacion} ${padre.nombre ?? ""}`
    : animal.padreNombre;

  const categoria = CATEGORIAS_ANIMAL.find((c) => c.value === animal.categoria);

  const sanidad = db.sanidad
    .filter((s) => s.animalId === animal.id)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const servicios = db.servicios
    .filter((s) => s.hembraId === animal.id)
    .sort(
      (a, b) => new Date(b.fechaServicio).getTime() - new Date(a.fechaServicio).getTime()
    );

  const partos = db.partos
    .filter((p) => p.madreId === animal.id)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const pesajes = db.pesajes
    .filter((p) => p.animalId === animal.id)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const leche = db.leche
    .filter((l) => l.animalId === animal.id)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const gastosAsociados = db.gastos
    .filter((g) => g.animalId === animal.id)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  const totalGastos = gastosAsociados.reduce((s, g) => s + g.monto, 0);

  const hijos = db.animales.filter(
    (a) => a.madreId === animal.id || a.padreId === animal.id
  );

  return (
    <div className="flex flex-col gap-5 -m-2">
      {/* Header con foto */}
      <div className="flex items-start gap-4">
        <div
          className="w-28 h-28 rounded-2xl overflow-hidden flex items-center justify-center shrink-0"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--rule)",
          }}
        >
          {animal.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={animal.fotoUrl}
              alt={animal.nombre ?? animal.nroIdentificacion}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <div className="text-[0.6rem] font-mono uppercase tracking-wider text-subtle mb-1">
                Sin foto
              </div>
              <div className="num text-2xl text-muted">{animal.nroIdentificacion}</div>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="chip primary">{categoria?.label}</span>
            <span className="chip">{animal.sexo === "hembra" ? "♀ Hembra" : "♂ Macho"}</span>
            <span
              className={"chip " + (animal.estado === "activo" ? "success" : "danger")}
            >
              {animal.estado}
            </span>
            {propietario && (
              <span className="chip accent" style={{ fontSize: "0.65rem" }}>
                {propietario.nombre}
              </span>
            )}
          </div>
          <div className="text-sm text-muted leading-relaxed">
            <span className="text-fg font-medium">{animal.raza || "Sin registrar"}</span> ·{" "}
            {edadTexto(animal.fechaNacimiento)}
            {animal.fechaNacimientoAprox ? " ~" : ""} · nacido el{" "}
            {fmtDate(animal.fechaNacimiento)}
          </div>
        </div>
      </div>

      {/* Datos básicos */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <DataRow label="Potrero" value={potrero?.nombre ?? "—"} />
        <DataRow label="Propietario" value={propietario?.nombre ?? "—"} />
        <DataRow label="Madre" value={madreLabel || "—"} />
        <DataRow label="Padre" value={padreLabel || "—"} />
      </div>

      {animal.notas && (
        <div className="p-3 rounded-lg bg-surface-2 text-sm text-muted italic border border-rule">
          {animal.notas}
        </div>
      )}

      {/* Métricas de historial */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <MiniStat label="Sanidad" value={sanidad.length} sub="eventos" />
        {animal.sexo === "hembra" ? (
          <MiniStat
            label="Reproducción"
            value={servicios.length}
            sub={`${partos.length} parto${partos.length === 1 ? "" : "s"}`}
          />
        ) : (
          <MiniStat label="Hijos" value={hijos.length} sub="registrados" />
        )}
        <MiniStat label="Pesajes" value={pesajes.length} sub={pesajes[0] ? `${fmtNumber(pesajes[0].pesoKg, 0)} kg` : "sin datos"} />
        <MiniStat
          label="Gastos"
          value={fmtCOP(totalGastos).replace("COP", "").trim()}
          sub={`${gastosAsociados.length} registro${gastosAsociados.length === 1 ? "" : "s"}`}
          isText
        />
      </div>

      {/* Sanidad */}
      <Section title="Historial sanitario" count={sanidad.length}>
        {sanidad.length === 0 ? (
          <EmptyLine label="Sin eventos sanitarios." />
        ) : (
          <ul className="flex flex-col gap-1">
            {sanidad.slice(0, 8).map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-surface-2"
              >
                <span className="chip" style={{ fontSize: "0.6rem" }}>
                  {TIPOS_SANIDAD.find((t) => t.value === s.tipo)?.label}
                </span>
                <span className="flex-1 text-sm">{s.producto}</span>
                {s.dosis && (
                  <span className="text-xs text-muted font-mono">{s.dosis}</span>
                )}
                <span className="text-xs text-muted">{fmtDate(s.fecha)}</span>
              </li>
            ))}
            {sanidad.length > 8 && (
              <li className="text-xs text-subtle text-center py-1">
                + {sanidad.length - 8} evento{sanidad.length - 8 === 1 ? "" : "s"} más
              </li>
            )}
          </ul>
        )}
      </Section>

      {/* Reproducción (solo si es relevante) */}
      {animal.sexo === "hembra" && (servicios.length > 0 || partos.length > 0) && (
        <Section title="Reproducción" count={servicios.length + partos.length}>
          <div className="flex flex-col gap-1">
            {servicios.map((s) => {
              const dias = s.fechaProbableParto ? diasHasta(s.fechaProbableParto) : null;
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-surface-2 text-sm"
                >
                  <span className="chip" style={{ fontSize: "0.6rem" }}>
                    {s.tipo === "monta_natural" ? "Monta" : "Inseminación"}
                  </span>
                  <span
                    className={
                      "chip " +
                      (s.resultado === "prenada"
                        ? "success"
                        : s.resultado === "vacia"
                        ? "danger"
                        : "accent")
                    }
                    style={{ fontSize: "0.6rem" }}
                  >
                    {s.resultado}
                  </span>
                  <span className="flex-1 text-xs text-muted">
                    {s.machoIdOReferencia}
                  </span>
                  <span className="text-xs text-muted">{fmtDate(s.fechaServicio)}</span>
                  {dias !== null && dias >= 0 && dias <= 60 && (
                    <span className="text-xs text-primary font-medium">
                      parto en {dias} d
                    </span>
                  )}
                </div>
              );
            })}
            {partos.map((p) => {
              const ternero = p.terneroId
                ? db.animales.find((a) => a.id === p.terneroId)
                : null;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-surface-2 text-sm"
                >
                  <span
                    className="chip primary"
                    style={{ fontSize: "0.6rem" }}
                  >
                    Parto
                  </span>
                  <span className="flex-1 text-xs text-muted">
                    {ternero
                      ? `Ternero #${ternero.nroIdentificacion} ${ternero.nombre ?? ""}`
                      : p.complicaciones ?? "—"}
                  </span>
                  {p.pesoTerneroKg && (
                    <span className="text-xs text-muted font-mono">
                      {p.pesoTerneroKg} kg
                    </span>
                  )}
                  <span className="text-xs text-muted">{fmtDate(p.fecha)}</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Descendencia */}
      {hijos.length > 0 && (
        <Section title="Descendencia" count={hijos.length}>
          <ul className="flex flex-wrap gap-1.5">
            {hijos.map((h) => (
              <li
                key={h.id}
                className="chip"
                style={{ fontSize: "0.68rem", padding: "0.2rem 0.6rem" }}
              >
                #{h.nroIdentificacion} {h.nombre ?? ""} ·{" "}
                {CATEGORIAS_ANIMAL.find((c) => c.value === h.categoria)?.label}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Pesajes */}
      {pesajes.length > 0 && (
        <Section title="Pesajes" count={pesajes.length}>
          <ul className="flex flex-col gap-1">
            {pesajes.slice(0, 6).map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-surface-2 text-sm"
              >
                <span className="chip" style={{ fontSize: "0.6rem" }}>
                  {p.tipo}
                </span>
                <span className="flex-1 font-mono">
                  {fmtNumber(p.pesoKg, 1)} <span className="text-xs text-muted">kg</span>
                </span>
                <span className="text-xs text-muted">{fmtDate(p.fecha)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Ordeño (solo vaca) */}
      {animal.categoria === "vaca" && leche.length > 0 && (
        <Section title="Últimos ordeños" count={leche.length}>
          <ul className="flex flex-col gap-1">
            {leche.slice(0, 5).map((l) => (
              <li
                key={l.id}
                className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-surface-2 text-sm"
              >
                <span className="text-xs text-muted w-24">{fmtDate(l.fecha)}</span>
                <span className="text-xs text-muted">
                  AM {fmtNumber(l.litrosManana, 1)}
                </span>
                <span className="text-xs text-muted">
                  PM {fmtNumber(l.litrosTarde, 1)}
                </span>
                <span className="flex-1 text-right font-mono font-semibold">
                  {fmtNumber(l.litrosManana + l.litrosTarde, 1)}{" "}
                  <span className="text-xs text-muted">L</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Gastos */}
      {gastosAsociados.length > 0 && (
        <Section title="Gastos asociados" count={gastosAsociados.length}>
          <ul className="flex flex-col gap-1">
            {gastosAsociados.slice(0, 6).map((g) => (
              <li
                key={g.id}
                className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-surface-2 text-sm"
              >
                <span className="flex-1 truncate">{g.concepto}</span>
                <span className="text-xs text-muted whitespace-nowrap">
                  {fmtDate(g.fecha)}
                </span>
                <span className="font-mono text-danger whitespace-nowrap">
                  {fmtCOP(g.monto)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Acciones */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-rule">
        <button className="btn btn-ghost" onClick={onClose}>
          Cerrar
        </button>
        <button className="btn btn-primary" onClick={onEdit}>
          Editar
        </button>
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="eyebrow">{label}</span>
      <span className="text-fg text-sm">{value}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
  isText,
}: {
  label: string;
  value: number | string;
  sub?: string;
  isText?: boolean;
}) {
  return (
    <div className="p-3 rounded-lg bg-surface-2 border border-rule">
      <div className="eyebrow">{label}</div>
      <div
        className={"num mt-1 text-fg " + (isText ? "text-lg" : "text-2xl")}
        style={{ color: "var(--primary)" }}
      >
        {value}
      </div>
      {sub && <div className="text-[0.68rem] text-subtle mt-0.5">{sub}</div>}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="eyebrow eyebrow-primary">{title}</div>
        {count !== undefined && (
          <span className="text-[0.62rem] font-mono text-subtle">{count}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyLine({ label }: { label: string }) {
  return <div className="text-xs text-muted italic px-2">{label}</div>;
}

function AnimalForm({
  initial,
  plantilla,
  onSaved,
  onCancel,
  onVarios,
}: {
  initial: Animal | null;
  /** Datos copiados del animal anterior ("Registrar otro animal"). */
  plantilla?: PlantillaAnimal;
  /** Con un animal nuevo recibe sus datos (para felicitar); al editar, null. */
  onSaved: (g: Guardado | null) => void;
  onCancel: () => void;
  /** Pasa al registro de varios animales a la vez. */
  onVarios?: () => void;
}) {
  const { db } = useDB();
  const { activa } = useFincaActiva();
  // Animal nuevo: formulario básico (lo mínimo). "Más datos" pasa al
  // completo sin perder lo escrito. Editar siempre muestra el completo.
  const [completo, setCompleto] = useState(!!initial);
  const [error, setError] = useState<string | null>(null);
  const [edadMeses, setEdadMeses] = useState(plantilla?.edadMeses ?? "");
  const [form, setForm] = useState<Animal>(
    initial ?? {
      id: uid(),
      nroIdentificacion: plantilla?.chapeta ?? "",
      nombre: "",
      sexo: "hembra",
      raza: "",
      // Vacía a propósito: antes venía en "hoy" y se guardaban vacas nacidas hoy.
      fechaNacimiento: "",
      categoria: "vaca",
      estado: "activo",
      createdAt: nowISO(),
      ...plantilla?.datos,
    }
  );

  function setCategoria(categoria: CategoriaAnimal) {
    setForm({ ...form, categoria, sexo: SEXO_DE_CATEGORIA[categoria] });
  }

  function setEdad(valor: string) {
    setEdadMeses(valor);
    if (valor) {
      setForm({ ...form, fechaNacimiento: fechaDesdeEdad(Number(valor)), fechaNacimientoAprox: true });
    } else {
      setForm({ ...form, fechaNacimiento: "", fechaNacimientoAprox: false });
    }
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const nro = form.nroIdentificacion.trim();
    const nombre = form.nombre?.trim() ?? "";
    if (!nro && !nombre) {
      setError("Escriba el número de chapeta o un nombre para el animal.");
      return;
    }
    if (!form.fechaNacimiento) {
      setError(
        completo
          ? "Ponga la fecha de nacimiento o escoja la edad aproximada."
          : "Escoja la edad aproximada del animal."
      );
      return;
    }
    const repetido = nro && db?.animales.find((a) => a.nroIdentificacion === nro && a.id !== form.id);
    if (repetido) {
      setError(`Ya hay un animal con la chapeta ${nro}${repetido.nombre ? ` (${repetido.nombre})` : ""}. Use otro número.`);
      return;
    }
    // Bloqueo por plan solo al AGREGAR (edición no chequea porque no cambia count).
    if (!initial && db && activa) {
      const plan = planEfectivo(activa);
      const limit = PLAN_LIMITS[plan].maxAnimales;
      if (limit !== null && db.animales.length >= limit) {
        setError(
          `Llegó al límite de ${limit} animales del plan ${planLabel(plan)}. Vaya a la sección Plan para cambiar de plan.`
        );
        return;
      }
    }
    const animal: Animal = {
      ...form,
      nroIdentificacion: nro || siguienteNumero(db?.animales ?? []),
      nombre,
      raza: form.raza.trim(),
    };
    const primero = !initial && (db?.animales.length ?? 0) === 0;
    updateCollection("animales", (list) => {
      const withoutOld = list.filter((a) => a.id !== animal.id);
      return [...withoutOld, animal];
    });
    onSaved(
      initial
        ? null
        : {
            animales: [animal],
            nroAuto: !nro,
            primero,
            modo: "uno",
            plantilla: {
              datos: {
                categoria: animal.categoria,
                sexo: animal.sexo,
                raza: animal.raza,
                fechaNacimiento: animal.fechaNacimiento,
                fechaNacimientoAprox: animal.fechaNacimientoAprox,
                potreroId: animal.potreroId,
                propietarioId: animal.propietarioId,
              },
              edadMeses,
              chapeta: chapetaSiguiente(
                animal.nroIdentificacion,
                new Set([...(db?.animales ?? []).map((a) => a.nroIdentificacion), animal.nroIdentificacion])
              ),
            },
          }
    );
  }

  function remove() {
    if (!initial) return;
    if (!confirm("¿Eliminar este animal? Esta acción no se puede deshacer.")) return;
    updateCollection("animales", (list) => list.filter((a) => a.id !== initial.id));
    onSaved(null);
  }

  const campoChapeta = (
    <FormRow label="Nº de chapeta" hint={completo ? undefined : "Si no tiene, déjelo vacío y le ponemos uno"}>
      <input
        value={form.nroIdentificacion}
        onChange={(e) => setForm({ ...form, nroIdentificacion: e.target.value })}
        placeholder="011"
        inputMode="text"
        autoFocus={!initial}
      />
    </FormRow>
  );
  const campoNombre = (
    <FormRow label="Nombre">
      <input
        value={form.nombre ?? ""}
        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        placeholder="Ej. Luna"
      />
    </FormRow>
  );
  const campoRaza = (
    <FormRow label={completo ? "Raza" : "Raza (opcional)"}>
      <input
        value={form.raza}
        onChange={(e) => setForm({ ...form, raza: e.target.value })}
        placeholder="Ej. Gyr Holstein"
      />
    </FormRow>
  );
  const campoEdad = (
    <FormRow label="Edad aproximada" required={!completo}>
      <select value={edadMeses} onChange={(e) => setEdad(e.target.value)}>
        <option value="">{completo ? "…o escoja la edad" : "Escoja la edad"}</option>
        {EDADES.map((ed) => (
          <option key={ed.meses} value={ed.meses}>{ed.label}</option>
        ))}
      </select>
    </FormRow>
  );
  const avisoError = error && (
    <div className="md:col-span-2 text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">{error}</div>
  );

  if (!completo) {
    return (
      <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <p className="md:col-span-2 text-sm text-muted -mt-1">
          {plantilla
            ? "Copiamos los datos del anterior: cambie solo lo que sea distinto."
            : "Con estos datos basta para empezar. Lo demás lo puede agregar después."}
        </p>
        {onVarios && (
          <button
            type="button"
            onClick={onVarios}
            className="md:col-span-2 -mt-2 text-left text-sm font-medium text-primary underline underline-offset-4"
          >
            ¿Tiene varios animales? Regístrelos todos de una vez →
          </button>
        )}
        {campoChapeta}
        {campoNombre}
        <FormRow label="¿Qué animal es?" required>
          <select
            value={form.categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaAnimal)}
          >
            {TIPOS_BASICO.map((c) => (
              <option key={c} value={c}>
                {CATEGORIAS_ANIMAL.find((x) => x.value === c)?.label ?? c}
              </option>
            ))}
          </select>
        </FormRow>
        {campoEdad}
        {campoRaza}

        {avisoError}

        <div className="md:col-span-2 flex flex-col gap-2 pt-1">
          <button type="submit" className="btn btn-primary justify-center">
            Guardar animal
          </button>
          <button
            type="button"
            className="btn btn-ghost justify-center"
            onClick={() => {
              setError(null);
              setCompleto(true);
            }}
          >
            + Agregar más datos (foto, potrero, madre, padre…)
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {campoChapeta}
      {campoNombre}
      <FormRow label="Categoría" required>
        <select
          value={form.categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaAnimal)}
        >
          {CATEGORIAS_ANIMAL.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Sexo" required>
        <select
          value={form.sexo}
          onChange={(e) => setForm({ ...form, sexo: e.target.value as Sexo })}
        >
          <option value="hembra">Hembra</option>
          <option value="macho">Macho</option>
        </select>
      </FormRow>
      {campoRaza}
      <FormRow label="Fecha de nacimiento" required>
        <input
          type="date"
          value={form.fechaNacimiento.slice(0, 10)}
          max={todayISO()}
          onChange={(e) => {
            setEdadMeses("");
            setForm({ ...form, fechaNacimiento: e.target.value, fechaNacimientoAprox: false });
          }}
        />
      </FormRow>
      {campoEdad}
      <FormRow label="Potrero">
        <select
          value={form.potreroId ?? ""}
          onChange={(e) => setForm({ ...form, potreroId: e.target.value || undefined })}
        >
          <option value="">— sin asignar —</option>
          {db?.potreros.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Propietario" hint="Socio responsable del arriendo de esta cabeza">
        <select
          value={form.propietarioId ?? ""}
          onChange={(e) => setForm({ ...form, propietarioId: e.target.value || undefined })}
        >
          <option value="">— sin asignar —</option>
          {db?.propietarios.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Estado" required>
        <select
          value={form.estado}
          onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoAnimal })}
        >
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Madre">
        <div className="flex flex-col gap-1.5">
          <select
            value={form.madreId ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                madreId: e.target.value || undefined,
                madreNombre: e.target.value ? undefined : form.madreNombre,
              })
            }
          >
            <option value="">Del hato…</option>
            {db?.animales.filter((a) => a.sexo === "hembra" && a.id !== form.id).map((a) => (
              <option key={a.id} value={a.id}>
                #{a.nroIdentificacion} {a.nombre}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={form.madreNombre ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                madreNombre: e.target.value || undefined,
                madreId: e.target.value ? undefined : form.madreId,
              })
            }
            placeholder="…o escribir otro nombre (madre externa)"
          />
        </div>
      </FormRow>
      <FormRow label="Padre">
        <div className="flex flex-col gap-1.5">
          <select
            value={form.padreId ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                padreId: e.target.value || undefined,
                padreNombre: e.target.value ? undefined : form.padreNombre,
              })
            }
          >
            <option value="">Del hato…</option>
            {db?.animales.filter((a) => a.sexo === "macho" && a.id !== form.id).map((a) => (
              <option key={a.id} value={a.id}>
                #{a.nroIdentificacion} {a.nombre}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={form.padreNombre ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                padreNombre: e.target.value || undefined,
                padreId: e.target.value ? undefined : form.padreId,
              })
            }
            placeholder="…o escribir otro nombre (padre externo)"
          />
        </div>
      </FormRow>
      <FormRow label="Notas" colspan={2}>
        <textarea
          rows={2}
          value={form.notas ?? ""}
          onChange={(e) => setForm({ ...form, notas: e.target.value })}
        />
      </FormRow>
      <FormRow label="Foto" colspan={2}>
        <PhotoInput
          value={form.fotoUrl}
          onChange={(v) => setForm({ ...form, fotoUrl: v })}
          fallbackLabel={form.nroIdentificacion || "Sin foto"}
        />
      </FormRow>

      {avisoError}

      <div className="md:col-span-2 flex items-center justify-between pt-2">
        <div>
          {initial ? (
            <button type="button" className="btn btn-danger" onClick={remove}>
              Eliminar
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => setCompleto(false)}>
              ← Formulario corto
            </button>
          )}
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
    </form>
  );
}

// ---------------------------------------------------------------------------
//  Después de registrar un animal nuevo: felicitación y "¿qué desea hacer
//  ahora?". El gasto va primero: es el siguiente paso que más engancha
//  (ver cuánto le cuesta la finca) y no depende de tener más animales.

function Felicitacion({
  guardado,
  onOtro,
  onVarios,
  onCerrar,
}: {
  guardado: Guardado;
  /** Otro animal, con los datos del anterior copiados. */
  onOtro: () => void;
  onVarios: () => void;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const { animales, nroAuto, primero, modo } = guardado;
  const animal = animales[animales.length - 1];
  const varios = animales.length > 1;
  const nombreAnimal = animal.nombre ? `${animal.nombre} (#${animal.nroIdentificacion})` : `#${animal.nroIdentificacion}`;

  const opciones: {
    Icon: React.ComponentType<{ size?: number }>;
    titulo: string;
    sub: string;
    accion: () => void;
    sugerida?: boolean;
  }[] = [
    {
      Icon: IconMoney,
      titulo: "Anotar un gasto",
      sub: "Sal, jornal, vacunas… y vea cuánto le cuesta la finca",
      accion: () => router.push(hrefNuevo("/gastos")),
      sugerida: true,
    },
    modo === "varios"
      ? {
          Icon: IconCow,
          titulo: "Registrar más animales",
          sub: "Otra tanda, varios a la vez",
          accion: onVarios,
        }
      : {
          Icon: IconCow,
          titulo: "Registrar otro animal",
          sub: "Le copiamos los datos de este; cambie solo lo distinto",
          accion: onOtro,
        },
    varios
      ? {
          Icon: IconHealth,
          titulo: "Anotar una vacuna o purga",
          sub: "Con la próxima fecha para que le avisemos",
          accion: () => router.push(hrefNuevo("/sanidad")),
        }
      : {
          Icon: IconHealth,
          titulo: "Anotarle una vacuna o purga",
          sub: `A ${animal.nombre || `#${animal.nroIdentificacion}`}, con la próxima fecha para que le avisemos`,
          accion: () => router.push(hrefNuevo("/sanidad", { animal: animal.id })),
        },
  ];
  if (modo === "uno") {
    opciones.push({
      Icon: IconCow,
      titulo: "Registrar varios a la vez",
      sub: "Si tiene muchos animales, en una sola pantalla",
      accion: onVarios,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center">
          <IconCheck size={28} />
        </div>
        <h3 className="mt-3 text-lg font-semibold tracking-tight">
          {varios
            ? `¡Registró ${animales.length} animales!`
            : primero
              ? "¡Registró su primer animal!"
              : "¡Animal registrado!"}
        </h3>
        <p className="text-sm text-muted mt-1">
          {varios ? "Ya están en su hato." : `${nombreAnimal} ya está en su hato.`}
          {nroAuto &&
            (varios
              ? " A los que no tenían chapeta les pusimos un número; lo puede cambiar cuando quiera."
              : ` Como no tenía chapeta le pusimos el número ${animal.nroIdentificacion}; lo puede cambiar cuando quiera.`)}
        </p>
      </div>

      <div>
        <div className="eyebrow mb-2">¿Qué desea hacer ahora?</div>
        <div className="flex flex-col gap-2">
          {opciones.map((o) => (
            <button
              key={o.titulo}
              type="button"
              onClick={o.accion}
              className={`flex items-center gap-3 text-left rounded-xl border px-3 py-3 transition hover:bg-surface-2 ${
                o.sugerida ? "border-primary bg-primary-soft/40" : "border-rule"
              }`}
            >
              <span
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  o.sugerida ? "bg-primary text-white" : "bg-primary-soft text-primary"
                }`}
              >
                <o.Icon size={18} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold">
                  {o.titulo}
                  {o.sugerida && <span className="ml-2 text-[0.65rem] font-mono uppercase tracking-wider text-primary">Sugerido</span>}
                </span>
                <span className="block text-xs text-muted mt-0.5">{o.sub}</span>
              </span>
              <span className="text-muted" aria-hidden>→</span>
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="btn btn-ghost justify-center" onClick={onCerrar}>
        Ver mis animales
      </button>
    </div>
  );
}
