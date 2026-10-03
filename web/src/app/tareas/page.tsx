"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDB } from "@/lib/useDB";
import { useAbrirNuevo } from "@/lib/tutorial";
import { updateCollection, uid, nowISO } from "@/lib/storage";
import { fmtDate, diasHasta, todayISO, ymdLocal } from "@/lib/format";
import {
  Tarea,
  SanidadEvento,
  ServicioReproductivo,
  CATEGORIAS_TAREA,
  PRIORIDADES_TAREA,
  CategoriaTarea,
  PrioridadTarea,
} from "@/lib/types";
import Modal from "@/components/Modal";
import FormRow from "@/components/FormRow";
import HeroStat from "@/components/HeroStat";
import { IconCheck, IconAlert, IconHealth, IconRepro } from "@/components/icons";
import ExportarPDFButton from "@/components/ExportarPDFButton";

type UnifiedItem = {
  key: string;
  fuente: "manual" | "sanidad" | "reproduccion";
  titulo: string;
  subtitulo?: string;
  fecha: string;
  dias: number | null;
  categoria: CategoriaTarea;
  prioridad: PrioridadTarea;
  completada: boolean;
  href?: string;
  tarea?: Tarea;
  sanidad?: SanidadEvento;
  servicio?: ServicioReproductivo;
};

const CAT_COLOR: Record<CategoriaTarea, string> = {
  sanidad: "var(--danger)",
  alimentacion: "var(--accent)",
  manejo: "var(--primary)",
  reproduccion: "var(--primary)",
  infraestructura: "var(--muted)",
  otros: "var(--muted)",
};

export default function TareasPage() {
  const { db, ready } = useDB();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Tarea | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  const [tab, setTab] = useState<"pendientes" | "hechas">("pendientes");
  const [filtroCat, setFiltroCat] = useState<CategoriaTarea | "todas">("todas");
  const [view, setView] = useState<"lista" | "calendario">("calendario");
  const [calMonth, setCalMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [dayModal, setDayModal] = useState<{ dateISO: string; items: UnifiedItem[] } | null>(null);
  // Desde el tutorial de primeros pasos: /tareas?nuevo=1 abre el formulario.
  useAbrirNuevo(() => {
    setEdit(null);
    setModalMode("edit");
    setOpen(true);
  }, ready);

  const unified: UnifiedItem[] = useMemo(() => {
    if (!db) return [];
    const items: UnifiedItem[] = [];

    for (const t of db.tareas) {
      items.push({
        key: "t:" + t.id,
        fuente: "manual",
        titulo: t.titulo,
        subtitulo: t.descripcion,
        fecha: t.fecha,
        dias: diasHasta(t.fecha),
        categoria: t.categoria,
        prioridad: t.prioridad,
        completada: t.completada,
        tarea: t,
      });
    }

    for (const s of db.sanidad) {
      // 1) Evento en sí mismo (programado o realizado)
      const dSelf = diasHasta(s.fecha);
      if (dSelf !== null && dSelf >= -30 && dSelf <= 120) {
        const animal = db.animales.find((a) => a.id === s.animalId);
        items.push({
          key: "s:" + s.id,
          fuente: "sanidad",
          titulo: `${s.producto} — ${animal?.nombre ?? "?"}`,
          subtitulo: `#${animal?.nroIdentificacion ?? "?"} · ${s.tipo}`,
          fecha: s.fecha,
          dias: dSelf,
          categoria: "sanidad",
          prioridad: dSelf < 0 ? "alta" : dSelf <= 7 ? "alta" : dSelf <= 30 ? "media" : "baja",
          completada: !!s.completada,
          href: "/sanidad",
          sanidad: s,
        });
      }

      // 2) Próximo evento (follow-up) sigue apareciendo como recordatorio
      if (s.proximoEventoFecha) {
        const d = diasHasta(s.proximoEventoFecha);
        if (d !== null && d >= -30 && d <= 120) {
          const animal = db.animales.find((a) => a.id === s.animalId);
          items.push({
            key: "sp:" + s.id,
            fuente: "sanidad",
            titulo: `Próximo: ${s.producto} — ${animal?.nombre ?? "?"}`,
            subtitulo: `#${animal?.nroIdentificacion ?? "?"} · ${s.tipo}`,
            fecha: s.proximoEventoFecha,
            dias: d,
            categoria: "sanidad",
            prioridad: d < 0 ? "alta" : d <= 7 ? "alta" : d <= 30 ? "media" : "baja",
            completada: false,
            href: "/sanidad",
            sanidad: s,
          });
        }
      }
    }

    for (const s of db.servicios) {
      if (
        (s.resultado !== "prenada" && s.resultado !== "pendiente") ||
        !s.fechaProbableParto
      )
        continue;
      const d = diasHasta(s.fechaProbableParto);
      if (d === null || d < -14 || d > 60) continue;
      const hembra = db.animales.find((a) => a.id === s.hembraId);
      items.push({
        key: "r:" + s.id,
        fuente: "reproduccion",
        titulo: `Parto previsto — ${hembra?.nombre ?? "?"}`,
        subtitulo: `#${hembra?.nroIdentificacion ?? "?"} · ${s.tipo === "inseminacion" ? "Inseminación" : "Monta"}`,
        fecha: s.fechaProbableParto,
        dias: d,
        categoria: "reproduccion",
        prioridad: d <= 30 ? "alta" : "media",
        completada: !!s.completada,
        href: "/reproduccion",
        servicio: s,
      });
    }

    items.sort((a, b) => {
      if (a.completada !== b.completada) return a.completada ? 1 : -1;
      const da = a.dias ?? 9999;
      const dbb = b.dias ?? 9999;
      return da - dbb;
    });
    return items;
  }, [db]);

  const visibles = useMemo(() => {
    return unified.filter((i) => {
      if (tab === "pendientes" && i.completada) return false;
      if (tab === "hechas" && !i.completada) return false;
      if (filtroCat !== "todas" && i.categoria !== filtroCat) return false;
      return true;
    });
  }, [unified, tab, filtroCat]);

  const visiblesCal = useMemo(() => {
    return unified.filter((i) => {
      if (filtroCat !== "todas" && i.categoria !== filtroCat) return false;
      return true;
    });
  }, [unified, filtroCat]);

  const stats = useMemo(() => {
    const pendientes = unified.filter((i) => !i.completada);
    const vencidas = pendientes.filter((i) => i.dias !== null && i.dias < 0);
    const hoy = pendientes.filter((i) => i.dias === 0);
    const semana = pendientes.filter((i) => i.dias !== null && i.dias > 0 && i.dias <= 7);
    return {
      total: pendientes.length,
      vencidas: vencidas.length,
      hoy: hoy.length,
      semana: semana.length,
    };
  }, [unified]);

  if (!ready) return <div className="text-muted">Cargando…</div>;

  function toggleTarea(item: UnifiedItem) {
    if (item.fuente === "manual" && item.tarea) {
      const t = item.tarea;
      updateCollection("tareas", (list) =>
        list.map((x) =>
          x.id === t.id
            ? {
                ...x,
                completada: !x.completada,
                completadaFecha: !x.completada ? nowISO() : undefined,
              }
            : x
        )
      );
      return;
    }
    if (item.fuente === "sanidad" && item.sanidad) {
      const s = item.sanidad;
      const esFollowUp = item.key.startsWith("sp:");
      updateCollection("sanidad", (list) =>
        list.map((x) => {
          if (x.id !== s.id) return x;
          // Si es un recordatorio de "próximo evento", chulearlo lo quita
          // (limpia proximo_evento_fecha del origen).
          if (esFollowUp) {
            return { ...x, proximoEventoFecha: undefined };
          }
          return {
            ...x,
            completada: !x.completada,
            completadaFecha: !x.completada ? nowISO() : undefined,
          };
        })
      );
      return;
    }
    if (item.fuente === "reproduccion" && item.servicio) {
      const s = item.servicio;
      updateCollection("servicios", (list) =>
        list.map((x) =>
          x.id === s.id
            ? {
                ...x,
                completada: !x.completada,
                completadaFecha: !x.completada ? nowISO() : undefined,
              }
            : x
        )
      );
    }
  }

  function openNueva() {
    setEdit(null);
    setModalMode("edit");
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Stat row · colored gradient tiles */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
        <HeroStat label="Pendientes" value={stats.total} tone="moss" />
        <HeroStat label="Vencidas" value={stats.vencidas} tone="coral" />
        <HeroStat label="Para hoy" value={stats.hoy} tone="citrus" />
        <HeroStat label="Esta semana" value={stats.semana} tone="copper" />
      </section>

      {/* Toolbar */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="inline-flex rounded-lg p-0.5"
            style={{ background: "var(--surface-2)", border: "1px solid var(--rule)" }}
          >
            <button
              className={"btn " + (view === "calendario" ? "btn-primary" : "btn-ghost")}
              style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
              onClick={() => setView("calendario")}
            >
              Calendario
            </button>
            <button
              className={"btn " + (view === "lista" ? "btn-primary" : "btn-ghost")}
              style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
              onClick={() => setView("lista")}
            >
              Lista
            </button>
          </div>
          <select
            value={filtroCat}
            onChange={(e) => setFiltroCat(e.target.value as CategoriaTarea | "todas")}
            className="!w-auto"
            style={{ minWidth: "160px", flex: 1 }}
          >
            <option value="todas">Todas las categorías</option>
            {CATEGORIAS_TAREA.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {view === "lista" && (
          <div className="flex gap-2 items-center">
            <button
              className={"btn " + (tab === "pendientes" ? "btn-primary" : "btn-ghost")}
              onClick={() => setTab("pendientes")}
            >
              Pendientes ({unified.filter((i) => !i.completada).length})
            </button>
            <button
              className={"btn " + (tab === "hechas" ? "btn-primary" : "btn-ghost")}
              onClick={() => setTab("hechas")}
            >
              Hechas ({unified.filter((i) => i.completada).length})
            </button>
          </div>
        )}

        <div className="flex gap-2 w-full md:w-auto">
          <ExportarPDFButton
            titulo="Actividades"
            subtitulo={view === "lista" ? (tab === "hechas" ? "Hechas" : "Pendientes") : "Todas (vista calendario)"}
            columnas={[
              { header: "Fecha", value: (i: UnifiedItem) => fmtDate(i.fecha) },
              { header: "Título", value: (i: UnifiedItem) => i.titulo },
              { header: "Detalle", value: (i: UnifiedItem) => i.subtitulo ?? "—" },
              { header: "Categoría", value: (i: UnifiedItem) => CATEGORIAS_TAREA.find((c) => c.value === i.categoria)?.label ?? i.categoria },
              { header: "Prioridad", value: (i: UnifiedItem) => PRIORIDADES_TAREA.find((p) => p.value === i.prioridad)?.label ?? i.prioridad },
              { header: "Estado", value: (i: UnifiedItem) => (i.completada ? "Completada" : "Pendiente") },
            ]}
            filas={view === "lista" ? visibles : visiblesCal}
            nombreArchivo="actividades"
          />
          <button
            className="btn btn-primary w-full md:w-auto md:self-start"
            onClick={openNueva}
            style={{ padding: "0.65rem 1.1rem", fontSize: "0.92rem", fontWeight: 600 }}
          >
            + Nueva actividad
          </button>
        </div>
      </div>

      {/* Main content */}
      {view === "calendario" ? (
        <MonthCalendar
          month={calMonth}
          setMonth={setCalMonth}
          items={visiblesCal}
          onEditTarea={(t) => {
            setEdit(t);
            setModalMode("view");
            setOpen(true);
          }}
          onDayClick={(dateISO, dayItems) => {
            setDayModal({ dateISO, items: dayItems });
          }}
        />
      ) : (
        <div className="card p-0">
          {visibles.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">
              {tab === "pendientes" ? "Todo al día. Nada pendiente." : "Aún no hay tareas completadas."}
            </div>
          ) : (
            <ul>
              {visibles.map((item) => (
                <TareaRow
                  key={item.key}
                  item={item}
                  onView={() => {
                    if (item.tarea) {
                      setEdit(item.tarea);
                      setModalMode("view");
                      setOpen(true);
                    } else if (item.href) {
                      window.location.href = item.href;
                    }
                  }}
                  onEdit={() => {
                    if (item.tarea) {
                      setEdit(item.tarea);
                      setModalMode("edit");
                      setOpen(true);
                    }
                  }}
                  onToggle={() => toggleTarea(item)}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          edit
            ? modalMode === "view"
              ? "Detalle de actividad"
              : "Editar actividad"
            : "Nueva actividad"
        }
        eyebrow="Actividades"
      >
        {edit && modalMode === "view" && (
          <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
            <button
              className="btn"
              onClick={() => {
                toggleTarea({
                  key: "",
                  fuente: "manual",
                  titulo: edit.titulo,
                  fecha: edit.fecha,
                  dias: null,
                  categoria: edit.categoria,
                  prioridad: edit.prioridad,
                  completada: edit.completada,
                  tarea: edit,
                });
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
              onClick={() => setModalMode("edit")}
              style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}
            >
              Editar
            </button>
          </div>
        )}
        <TareaForm
          initial={edit}
          readOnly={!!edit && modalMode === "view"}
          onSaved={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>

      <Modal
        open={!!dayModal}
        onClose={() => setDayModal(null)}
        title={dayModal ? fmtDate(dayModal.dateISO) : ""}
        eyebrow="Resumen del día"
      >
        {dayModal && (
          <DayResumen
            items={dayModal.items}
            onOpenItem={(it) => {
              if (it.tarea) {
                setEdit(it.tarea);
                setModalMode("view");
                setDayModal(null);
                setOpen(true);
              } else if (it.href) {
                window.location.href = it.href;
              }
            }}
            onToggleItem={(it) => toggleTarea(it)}
            onClose={() => setDayModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function DayResumen({
  items,
  onOpenItem,
  onToggleItem,
  onClose,
}: {
  items: UnifiedItem[];
  onOpenItem: (it: UnifiedItem) => void;
  onToggleItem: (it: UnifiedItem) => void;
  onClose: () => void;
}) {
  const hechas = items.filter((i) => i.completada);
  const pendientes = items.filter((i) => !i.completada);

  function Section({ title, list }: { title: string; list: UnifiedItem[] }) {
    if (list.length === 0) return null;
    return (
      <div>
        <div className="eyebrow mb-2">
          {title} ({list.length})
        </div>
        <ul className="space-y-1.5">
          {list.map((it) => {
            const puedeChulear =
              (it.fuente === "manual" && it.tarea) ||
              (it.fuente === "sanidad" && it.sanidad) ||
              (it.fuente === "reproduccion" && it.servicio);
            return (
              <li
                key={it.key}
                className="rounded-md border p-3 cursor-pointer hover:bg-surface-2 transition"
                style={{
                  borderColor: "var(--rule)",
                  borderLeft: `3px solid ${CAT_COLOR[it.categoria]}`,
                }}
                onClick={() => onOpenItem(it)}
              >
                <div className="flex items-start gap-2">
                  <StatusIcon
                    completada={it.completada}
                    onToggle={puedeChulear ? () => onToggleItem(it) : undefined}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className={
                        "font-medium text-sm " +
                        (it.completada ? "line-through opacity-60" : "")
                      }
                    >
                      {it.titulo}
                    </div>
                    {it.subtitulo && (
                      <div className="text-xs text-muted mt-0.5">{it.subtitulo}</div>
                    )}
                    <div className="text-[0.62rem] font-mono uppercase tracking-wider text-subtle mt-1">
                      {it.fuente === "manual"
                        ? CATEGORIAS_TAREA.find((c) => c.value === it.categoria)?.label ?? it.categoria
                        : it.fuente === "sanidad"
                        ? "Sanidad"
                        : "Reproducción"}
                      {it.prioridad === "alta" && !it.completada ? " · prioridad alta" : ""}
                    </div>
                  </div>
                  {puedeChulear && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleItem(it);
                      }}
                      className="btn shrink-0"
                      style={{
                        padding: "0.3rem 0.7rem",
                        fontSize: "0.72rem",
                        background: it.completada ? "var(--surface-2)" : "var(--primary-soft)",
                        color: it.completada ? "var(--muted)" : "var(--primary)",
                        border: `1px solid ${it.completada ? "var(--rule)" : "var(--primary)"}`,
                      }}
                    >
                      {it.completada ? "↺ Pendiente" : "✓ Realizada"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="text-center text-muted text-sm py-6">
          Sin actividades este día.
        </div>
      ) : (
        <>
          <Section title="Pendientes" list={pendientes} />
          <Section title="Realizadas" list={hechas} />
        </>
      )}
      <div className="flex justify-end pt-2 border-t border-rule">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

function StatusIcon({
  completada,
  onToggle,
}: {
  completada: boolean;
  onToggle?: () => void;
}) {
  const commonStyle = completada
    ? { background: "var(--primary)", color: "var(--primary-ink)", border: "1.5px solid var(--primary)" }
    : { border: "1.5px dashed var(--rule-strong)", color: "var(--muted)" };
  const title = completada ? "Marcar pendiente" : "Marcar realizada";
  if (onToggle) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="inline-flex items-center justify-center shrink-0 w-5 h-5 rounded-full"
        style={{ ...commonStyle, cursor: "pointer" }}
        title={title}
        aria-label={title}
        aria-pressed={completada}
      >
        {completada ? <IconCheck size={12} strokeWidth={3} /> : null}
      </button>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 w-5 h-5 rounded-full"
      style={commonStyle}
      title={completada ? "Realizada" : "Pendiente"}
      aria-label={completada ? "Realizada" : "Pendiente"}
    >
      {completada ? <IconCheck size={12} strokeWidth={3} /> : null}
    </span>
  );
}

function TareaRow({
  item,
  onView,
  onEdit,
  onToggle,
}: {
  item: UnifiedItem;
  onView: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const vencida = !item.completada && item.dias !== null && item.dias < 0;
  const hoy = !item.completada && item.dias === 0;
  const catColor = CAT_COLOR[item.categoria];
  const isManual = item.fuente === "manual";

  return (
    <li
      className="flex items-start gap-3 px-4 py-3.5 border-b border-rule last:border-b-0 hover:bg-surface-2 transition group cursor-pointer"
      onClick={onView}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView();
        }
      }}
    >
      <div
        className="w-0.5 self-stretch rounded-full shrink-0 mt-0.5"
        style={{ background: catColor, opacity: item.completada ? 0.3 : 0.7 }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusIcon
            completada={item.completada}
            onToggle={
              (item.fuente === "manual" && item.tarea) ||
              (item.fuente === "sanidad" && item.sanidad) ||
              (item.fuente === "reproduccion" && item.servicio)
                ? onToggle
                : undefined
            }
          />
          <div
            className={
              "font-medium text-fg " +
              (item.completada ? "line-through opacity-50" : "")
            }
          >
            {item.titulo}
          </div>
          {!isManual && (
            <span className="chip ghost" style={{ padding: "0.1rem 0.5rem", fontSize: "0.62rem" }}>
              {item.fuente === "sanidad" ? (
                <>
                  <IconHealth size={10} /> Sanidad
                </>
              ) : (
                <>
                  <IconRepro size={10} /> Reproducción
                </>
              )}
            </span>
          )}
          {item.prioridad === "alta" && !item.completada && (
            <span className="chip danger" style={{ padding: "0.1rem 0.5rem", fontSize: "0.62rem" }}>
              alta
            </span>
          )}
        </div>
        {item.subtitulo && (
          <div className="text-xs text-muted mt-0.5">{item.subtitulo}</div>
        )}
      </div>

      <div className="text-right shrink-0 flex flex-col items-end gap-1">
        <div className="text-xs text-muted">{fmtDate(item.fecha)}</div>
        {!item.completada && item.dias !== null && (
          <span
            className={
              "chip " +
              (vencida ? "danger" : hoy ? "accent" : item.dias <= 7 ? "primary" : "ghost")
            }
            style={{ padding: "0.1rem 0.55rem", fontSize: "0.65rem" }}
          >
            {vencida ? (
              <>
                <IconAlert size={10} /> {Math.abs(item.dias)} d atrás
              </>
            ) : hoy ? (
              "hoy"
            ) : (
              `en ${item.dias} d`
            )}
          </span>
        )}
        {(isManual && item.tarea) ||
        (item.fuente === "sanidad" && item.sanidad) ||
        (item.fuente === "reproduccion" && item.servicio) ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="btn"
            style={{
              padding: "0.3rem 0.7rem",
              fontSize: "0.72rem",
              background: item.completada ? "var(--surface-2)" : "var(--primary-soft)",
              color: item.completada ? "var(--muted)" : "var(--primary)",
              border: `1px solid ${item.completada ? "var(--rule)" : "var(--primary)"}`,
            }}
          >
            {item.completada ? "↺ Pendiente" : "✓ Realizada"}
          </button>
        ) : item.href ? (
          <Link
            href={item.href}
            onClick={(e) => e.stopPropagation()}
            className="text-[0.68rem] text-primary hover:underline font-mono uppercase tracking-wider"
          >
            abrir →
          </Link>
        ) : null}
        {isManual && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-[0.68rem] text-primary hover:underline font-mono uppercase tracking-wider md:opacity-0 md:group-hover:opacity-100 transition"
          >
            editar
          </button>
        )}
      </div>
    </li>
  );
}

function TareaForm({
  initial,
  readOnly = false,
  onSaved,
  onCancel,
}: {
  initial: Tarea | null;
  readOnly?: boolean;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { db } = useDB();
  const [form, setForm] = useState<Tarea>(() => {
    if (initial) {
      const asignadoIds =
        initial.asignadoAIds && initial.asignadoAIds.length > 0
          ? initial.asignadoAIds
          : initial.asignadoAId
          ? [initial.asignadoAId]
          : [];
      const animalIds =
        initial.animalIds && initial.animalIds.length > 0
          ? initial.animalIds
          : initial.animalId
          ? [initial.animalId]
          : [];
      return { ...initial, asignadoAIds: asignadoIds, animalIds };
    }
    return {
      id: uid(),
      titulo: "",
      fecha: todayISO(),
      prioridad: "media",
      categoria: "manejo",
      completada: false,
      completadaFecha: undefined,
      asignadoAIds: [],
      animalIds: [],
      createdAt: nowISO(),
    };
  });
  const [animalSearch, setAnimalSearch] = useState("");
  // Si el usuario tocó manualmente el toggle Programada/Realizada, no lo
  // pisamos con la auto-detección al cambiar la fecha.
  const [estadoManual, setEstadoManual] = useState(!!initial);

  // Auto-detect: fecha < hoy → realizada; fecha >= hoy → programada.
  useEffect(() => {
    if (estadoManual) return;
    const soloFecha = (form.fecha || "").slice(0, 10);
    const auto = soloFecha && soloFecha < todayISO();
    if (auto !== form.completada) {
      setForm((f) => ({
        ...f,
        completada: !!auto,
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
    if (!form.titulo.trim()) {
      alert("Falta el título de la actividad");
      return;
    }
    const asignadoAIds = form.asignadoAIds ?? [];
    const animalIds = form.animalIds ?? [];
    const clean: Tarea = {
      ...form,
      asignadoAIds,
      animalIds,
      asignadoAId: asignadoAIds[0],
      animalId: animalIds[0],
    };
    updateCollection("tareas", (list) => [
      ...list.filter((t) => t.id !== clean.id),
      clean,
    ]);
    onSaved();
  }

  function toggleAsignado(id: string) {
    const prev = form.asignadoAIds ?? [];
    setForm({
      ...form,
      asignadoAIds: prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    });
  }

  function toggleAnimal(id: string) {
    const prev = form.animalIds ?? [];
    setForm({
      ...form,
      animalIds: prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    });
  }

  const animalesActivos = (db?.animales ?? []).filter((a) => a.estado === "activo");
  const q = animalSearch.trim().toLowerCase();
  const animalesFiltrados = q
    ? animalesActivos.filter(
        (a) =>
          a.nroIdentificacion.toLowerCase().includes(q) ||
          (a.nombre ?? "").toLowerCase().includes(q)
      )
    : animalesActivos;
  const seleccionAsignado = form.asignadoAIds ?? [];
  const seleccionAnimales = form.animalIds ?? [];

  function remove() {
    if (!initial) return;
    if (!confirm("¿Eliminar esta actividad?")) return;
    updateCollection("tareas", (list) => list.filter((t) => t.id !== initial.id));
    onSaved();
  }

  return (
    <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <fieldset disabled={readOnly} className="contents">
      <FormRow label="Estado" required colspan={2}>
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: false, label: "Programada", hint: "pendiente / futura" },
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
      <FormRow label="Título" required colspan={2}>
        <input
          value={form.titulo}
          onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          placeholder="Ej. Traer sal de la veterinaria"
          autoFocus
        />
      </FormRow>
      <FormRow label="Fecha" required>
        <input
          type="date"
          value={form.fecha.slice(0, 10)}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
        />
      </FormRow>
      <FormRow label="Prioridad" required>
        <div className="flex flex-wrap gap-1.5">
          {PRIORIDADES_TAREA.map((p) => {
            const on = form.prioridad === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setForm({ ...form, prioridad: p.value })}
                className="btn"
                style={{
                  padding: "0.35rem 0.9rem",
                  fontSize: "0.78rem",
                  background: on ? "var(--primary)" : "var(--surface-2)",
                  color: on ? "var(--primary-ink)" : "var(--fg)",
                  border: `1px solid ${on ? "var(--primary)" : "var(--rule)"}`,
                }}
                aria-pressed={on}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </FormRow>
      <FormRow label="Categoría" required>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIAS_TAREA.map((c) => {
            const on = form.categoria === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm({ ...form, categoria: c.value })}
                className="btn"
                style={{
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.78rem",
                  background: on ? "var(--primary)" : "var(--surface-2)",
                  color: on ? "var(--primary-ink)" : "var(--fg)",
                  border: `1px solid ${on ? "var(--primary)" : "var(--rule)"}`,
                }}
                aria-pressed={on}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </FormRow>
      <FormRow label={`${form.completada ? "Quiénes la realizaron" : "Asignada a"}${seleccionAsignado.length > 0 ? ` (${seleccionAsignado.length})` : ""}`} colspan={2}>
        {(db?.propietarios ?? []).length === 0 ? (
          <div className="text-xs text-muted">Aún no hay propietarios registrados.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {db?.propietarios.map((p) => {
              const on = seleccionAsignado.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleAsignado(p.id)}
                  className="btn"
                  style={{
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.78rem",
                    background: on ? "var(--primary)" : "var(--surface-2)",
                    color: on ? "var(--primary-ink)" : "var(--fg)",
                    border: `1px solid ${on ? "var(--primary)" : "var(--rule)"}`,
                  }}
                  aria-pressed={on}
                >
                  {on ? "✓ " : ""}
                  {p.nombre}
                </button>
              );
            })}
          </div>
        )}
      </FormRow>
      <FormRow label={`Animales (opcional)${seleccionAnimales.length > 0 ? ` — ${seleccionAnimales.length} seleccionados` : ""}`} colspan={2}>
        {animalesActivos.length === 0 ? (
          <div className="text-xs text-muted">No hay animales activos.</div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="search"
                value={animalSearch}
                onChange={(e) => setAnimalSearch(e.target.value)}
                placeholder="Buscar por # o nombre…"
                className="!w-auto flex-1"
                style={{ minWidth: "160px" }}
              />
              {seleccionAnimales.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem" }}
                  onClick={() => setForm({ ...form, animalIds: [] })}
                >
                  Limpiar
                </button>
              )}
            </div>
            <div
              className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-2 rounded-md"
              style={{ border: "1px solid var(--rule)", background: "var(--surface-2)" }}
            >
              {animalesFiltrados.length === 0 ? (
                <div className="text-xs text-muted p-1">Sin coincidencias.</div>
              ) : (
                animalesFiltrados.map((a) => {
                  const on = seleccionAnimales.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAnimal(a.id)}
                      className="btn"
                      style={{
                        padding: "0.3rem 0.65rem",
                        fontSize: "0.75rem",
                        background: on ? "var(--primary)" : "var(--surface)",
                        color: on ? "var(--primary-ink)" : "var(--fg)",
                        border: `1px solid ${on ? "var(--primary)" : "var(--rule)"}`,
                      }}
                      aria-pressed={on}
                    >
                      {on ? "✓ " : ""}#{a.nroIdentificacion}
                      {a.nombre ? ` · ${a.nombre}` : ""}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </FormRow>
      <FormRow label="Potrero (opcional)">
        <select
          value={form.potreroId ?? ""}
          onChange={(e) =>
            setForm({ ...form, potreroId: e.target.value || undefined })
          }
        >
          <option value="">— ninguno —</option>
          {db?.potreros.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Descripción" colspan={2}>
        <textarea
          rows={3}
          value={form.descripcion ?? ""}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          placeholder="Detalles, materiales, notas…"
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

// ═══════════════════════════════════════════════════════════════════════════
// Calendar view
// ═══════════════════════════════════════════════════════════════════════════

const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DAY_LABELS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function MonthCalendar({
  month,
  setMonth,
  items,
  onEditTarea,
  onDayClick,
}: {
  month: Date;
  setMonth: (d: Date) => void;
  items: UnifiedItem[];
  onEditTarea: (t: Tarea) => void;
  onDayClick: (dateISO: string, dayItems: UnifiedItem[]) => void;
}) {
  const year = month.getFullYear();
  const monthIdx = month.getMonth();
  const first = new Date(year, monthIdx, 1);
  const lastDay = new Date(year, monthIdx + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7;
  const totalCells = Math.ceil((leading + lastDay) / 7) * 7;

  const byDay = new Map<string, UnifiedItem[]>();
  for (const it of items) {
    const key = it.fecha.slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(it);
  }

  const today = ymdLocal(new Date());

  function prevMonth() {
    setMonth(new Date(year, monthIdx - 1, 1));
  }
  function nextMonth() {
    setMonth(new Date(year, monthIdx + 1, 1));
  }
  function goToday() {
    const d = new Date();
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="eyebrow">Cronograma</div>
          <h3 className="text-lg font-semibold tracking-tight capitalize">
            {MONTH_LABELS[monthIdx]} {year}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost" onClick={prevMonth} style={{ padding: "0.35rem 0.7rem" }}>
            ←
          </button>
          <button className="btn btn-ghost" onClick={goToday} style={{ padding: "0.35rem 0.7rem", fontSize: "0.78rem" }}>
            Hoy
          </button>
          <button className="btn btn-ghost" onClick={nextMonth} style={{ padding: "0.35rem 0.7rem" }}>
            →
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS_SHORT.map((d) => (
          <div
            key={d}
            className="text-[0.62rem] font-mono uppercase tracking-widest text-muted text-center py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: totalCells }).map((_, idx) => {
          const dayNum = idx - leading + 1;
          const inMonth = dayNum >= 1 && dayNum <= lastDay;
          const cellDate = inMonth ? new Date(year, monthIdx, dayNum) : null;
          const key = cellDate ? ymdLocal(cellDate) : "";
          const dayItems = key ? byDay.get(key) ?? [] : [];
          const isToday = key === today;
          const isWeekend = idx % 7 >= 5;

          return (
            <div
              key={idx}
              className={
                "min-h-[58px] md:min-h-[92px] rounded-md md:rounded-lg p-1 md:p-1.5 flex flex-col gap-0.5 md:gap-1 relative overflow-hidden " +
                (inMonth ? "cursor-pointer hover:brightness-95" : "")
              }
              onClick={() => {
                if (inMonth && key) onDayClick(key, dayItems);
              }}
              role={inMonth ? "button" : undefined}
              tabIndex={inMonth ? 0 : undefined}
              onKeyDown={(e) => {
                if (inMonth && key && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onDayClick(key, dayItems);
                }
              }}
              style={{
                background: inMonth
                  ? isToday
                    ? "var(--primary-soft)"
                    : "var(--surface)"
                  : "transparent",
                border: `1px solid ${
                  isToday ? "var(--primary)" : "var(--rule)"
                }`,
                opacity: inMonth ? 1 : 0.35,
              }}
            >
              {inMonth && (
                <div className="flex items-center justify-between">
                  <span
                    className={
                      "num text-xs md:text-sm " +
                      (isToday
                        ? "text-primary font-semibold"
                        : isWeekend
                        ? "text-muted"
                        : "text-fg")
                    }
                  >
                    {dayNum}
                  </span>
                  {dayItems.length > 0 && (
                    <span
                      className="text-[0.5rem] md:text-[0.55rem] font-mono uppercase text-muted"
                      title={`${dayItems.length} eventos`}
                    >
                      {dayItems.length}
                    </span>
                  )}
                </div>
              )}
              {/* Mobile: dots only (tap the cell for details) */}
              <div className="md:hidden flex flex-wrap gap-0.5 mt-auto pointer-events-none">
                {dayItems.slice(0, 4).map((it) => (
                  <span
                    key={it.key}
                    aria-label={it.titulo}
                    title={it.titulo}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: CAT_COLOR[it.categoria],
                      opacity: it.completada ? 0.4 : 1,
                    }}
                  />
                ))}
                {dayItems.length > 4 && (
                  <span className="text-[0.5rem] text-muted leading-none">+{dayItems.length - 4}</span>
                )}
              </div>
              {/* Desktop: labels */}
              <div className="hidden md:flex md:flex-col md:gap-1">
                {dayItems.slice(0, 3).map((it) => (
                  <button
                    key={it.key}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (it.tarea) onEditTarea(it.tarea);
                      else if (it.href) window.location.href = it.href;
                    }}
                    className="text-left w-full rounded px-1.5 py-1 text-[0.68rem] leading-tight truncate transition hover:brightness-110"
                    style={{
                      background: `color-mix(in oklab, ${CAT_COLOR[it.categoria]} 14%, transparent)`,
                      color: CAT_COLOR[it.categoria],
                      borderLeft: `2px solid ${CAT_COLOR[it.categoria]}`,
                      textDecoration: it.completada ? "line-through" : "none",
                      opacity: it.completada ? 0.6 : 1,
                    }}
                    title={it.titulo}
                  >
                    {it.titulo}
                  </button>
                ))}
                {dayItems.length > 3 && (
                  <div className="text-[0.6rem] font-mono text-muted px-1">
                    +{dayItems.length - 3} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-rule">
        {CATEGORIAS_TAREA.map((c) => (
          <div key={c.value} className="flex items-center gap-1.5 text-[0.7rem] text-muted">
            <span
              className="w-2 h-2 rounded-sm"
              style={{ background: CAT_COLOR[c.value] }}
            />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}
