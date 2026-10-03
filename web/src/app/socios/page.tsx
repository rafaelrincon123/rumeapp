"use client";

import { useEffect, useMemo, useState } from "react";
import { useDB } from "@/lib/useDB";
import { useAbrirNuevo } from "@/lib/tutorial";
import { useAuth } from "@/lib/useAuth";
import { useFincaActiva } from "@/lib/useFincaActiva";
import { updateCollection, uid } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";
import { Propietario } from "@/lib/types";
import { fmtPct } from "@/lib/format";
import Modal from "@/components/Modal";
import FormRow from "@/components/FormRow";
import { IconUser } from "@/components/icons";
import PlanUsageBanner from "@/components/PlanUsageBanner";
import { Miembro, listarMiembros } from "@/lib/equipo";
import ExportarPDFButton from "@/components/ExportarPDFButton";

interface SocioStats {
  animales: number;
  gastos: number;
  tareas: number;
}

export default function SociosPage() {
  const { db, ready } = useDB();
  const { user, authUserId } = useAuth();
  const { activa } = useFincaActiva();
  const [editing, setEditing] = useState<Propietario | null>(null);
  const [creating, setCreating] = useState(false);
  const [reassignSource, setReassignSource] = useState<Propietario | null>(null);
  const [linkTarget, setLinkTarget] = useState<Propietario | null>(null);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Desde el tutorial de primeros pasos: /socios?nuevo=1 abre el formulario.
  useAbrirNuevo(() => setCreating(true), ready);

  const isOwner = !!(activa && authUserId && activa.ownerUserId === authUserId);
  const miMiembro = useMemo(
    () => miembros.find((m) => m.userId === authUserId) ?? null,
    [miembros, authUserId]
  );
  const puedoGestionar = isOwner || miMiembro?.rol === "admin";

  useEffect(() => {
    if (!activa) return;
    listarMiembros(activa.id)
      .then(setMiembros)
      .catch((e) => console.error("[socios] listarMiembros", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activa?.id]);

  const socios = useMemo(() => {
    if (!db) return [] as Propietario[];
    return [...db.propietarios].sort((a, b) =>
      (b.participacionPct ?? 0) - (a.participacionPct ?? 0) ||
      a.nombre.localeCompare(b.nombre)
    );
  }, [db]);

  const stats: Record<string, SocioStats> = useMemo(() => {
    if (!db) return {};
    const out: Record<string, SocioStats> = {};
    for (const p of db.propietarios) {
      out[p.id] = {
        animales: db.animales.filter((a) => a.propietarioId === p.id).length,
        gastos: db.gastos.filter(
          (g) =>
            g.pagadoPor === p.id ||
            (g.participantes ?? []).includes(p.id) ||
            (g.pagadoPorIds ?? []).includes(p.id)
        ).length,
        tareas: db.tareas.filter(
          (t) =>
            t.asignadoAId === p.id || (t.asignadoAIds ?? []).includes(p.id)
        ).length,
      };
    }
    return out;
  }, [db]);

  if (!ready) return <div className="text-muted">Cargando…</div>;

  async function vincularmeA(prop: Propietario) {
    if (!authUserId) return;
    setBusy(prop.id);
    setErr(null);
    try {
      const sb = getSupabase();
      const { error } = await sb.rpc("vincular_propietario_a_mi", { p_id: prop.id });
      if (error) throw new Error(error.message);
      // Reflejo local: reasignar auth_user_id
      updateCollection("propietarios", (list) =>
        list.map((p) => {
          if (p.id === prop.id) return { ...p, authUserId };
          // El auth_user_id es único por finca; despega al anterior
          if (p.authUserId === authUserId) return { ...p, authUserId: undefined };
          return p;
        })
      );
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function vincularAMiembro(prop: Propietario, userId: string) {
    setBusy(prop.id);
    setErr(null);
    try {
      const sb = getSupabase();
      const { error } = await sb.rpc("vincular_propietario_a_miembro", {
        p_propietario_id: prop.id,
        p_user_id: userId,
      });
      if (error) throw new Error(error.message);
      updateCollection("propietarios", (list) =>
        list.map((p) => {
          if (p.id === prop.id) return { ...p, authUserId: userId };
          if (p.authUserId === userId) return { ...p, authUserId: undefined };
          return p;
        })
      );
      setLinkTarget(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function desvincular(prop: Propietario) {
    if (!confirm(`¿Desvincular a "${prop.nombre}" de su cuenta de acceso?`)) return;
    setBusy(prop.id);
    setErr(null);
    try {
      const sb = getSupabase();
      const { error } = await sb.rpc("desvincular_propietario", { p_propietario_id: prop.id });
      if (error) throw new Error(error.message);
      updateCollection("propietarios", (list) =>
        list.map((p) => (p.id === prop.id ? { ...p, authUserId: undefined } : p))
      );
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function reasignarA(destino: Propietario) {
    if (!reassignSource) return;
    setBusy(reassignSource.id);
    setErr(null);
    try {
      const sb = getSupabase();
      const { error } = await sb.rpc("reasignar_propietario", {
        p_from: reassignSource.id,
        p_to: destino.id,
      });
      if (error) throw new Error(error.message);
      setReassignSource(null);
      // Recargamos el cache — el servidor movió muchas filas
      window.location.reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function eliminar(prop: Propietario) {
    if (!confirm(`¿Eliminar a "${prop.nombre}"? Debe estar sin animales, gastos ni tareas.`)) return;
    setBusy(prop.id);
    setErr(null);
    try {
      const sb = getSupabase();
      const { error } = await sb.rpc("eliminar_propietario", { p_id: prop.id });
      if (error) throw new Error(error.message);
      updateCollection("propietarios", (list) => list.filter((p) => p.id !== prop.id));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const totalPct = socios.reduce((sum, p) => sum + (p.participacionPct ?? 0), 0);

  return (
    <div className="space-y-4">
      <PlanUsageBanner resource="usuarios" used={socios.length} />
      <div className="card">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <div className="eyebrow">Finca activa</div>
            <div className="text-base font-semibold mt-1">{activa?.nombre ?? "—"}</div>
          </div>
          <div className="text-[0.7rem] font-mono text-muted">
            Total participación:{" "}
            <span
              className={
                Math.abs(totalPct - 100) < 0.5 ? "text-fg" : "text-danger font-semibold"
              }
            >
              {totalPct.toFixed(1)}%
            </span>
          </div>
        </div>
        {!puedoGestionar && (
          <p className="text-xs text-muted mt-2">
            Solo el owner o un admin de la finca pueden vincular, reasignar o eliminar socios.
            Puedes ver la lista.
          </p>
        )}
        {err && (
          <div className="mt-3 text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">
            {err}
          </div>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <ExportarPDFButton
            titulo="Socios"
            columnas={[
              { header: "Nombre", value: (p: Propietario) => p.nombre },
              { header: "Email", value: (p: Propietario) => p.email },
              { header: "Participación", value: (p: Propietario) => fmtPct(p.participacionPct) },
              { header: "Animales", value: (p: Propietario) => String(stats[p.id]?.animales ?? 0) },
              { header: "Gastos", value: (p: Propietario) => String(stats[p.id]?.gastos ?? 0) },
              { header: "Tareas", value: (p: Propietario) => String(stats[p.id]?.tareas ?? 0) },
              { header: "Vinculado", value: (p: Propietario) => (p.authUserId ? "Sí" : "No") },
            ]}
            filas={socios}
            nombreArchivo="socios"
          />
          {puedoGestionar && (
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              + Nuevo socio
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {socios.map((p) => {
          const s = stats[p.id] ?? { animales: 0, gastos: 0, tareas: 0 };
          const isMe = p.authUserId === authUserId;
          const currentLinked = user?.id === p.id;
          return (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold tracking-tight truncate">
                      {p.nombre}
                    </h3>
                    {isMe && (
                      <span
                        className="chip"
                        style={{
                          background: "var(--primary-soft)",
                          color: "var(--primary)",
                          fontSize: "0.6rem",
                        }}
                      >
                        TÚ
                      </span>
                    )}
                    {currentLinked && !isMe && (
                      <span className="chip ghost" style={{ fontSize: "0.6rem" }}>
                        activo
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-0.5 truncate">{p.email}</div>
                </div>
                <div
                  className="text-lg font-mono font-semibold tabular-nums shrink-0"
                  style={{ color: "var(--primary)" }}
                >
                  {fmtPct(p.participacionPct ?? 0)}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <StatMini label="Animales" value={s.animales} />
                <StatMini label="Gastos" value={s.gastos} />
                <StatMini label="Tareas" value={s.tareas} />
              </div>

              <div className="mt-3 pt-3 border-t border-rule flex items-center justify-between gap-2 flex-wrap">
                <div className="text-[0.62rem] font-mono text-subtle">
                  {p.authUserId ? "Vinculado a auth" : "Sin vincular"}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {puedoGestionar && !isMe && (
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: "0.75rem", padding: "0.35rem 0.7rem" }}
                      onClick={() => vincularmeA(p)}
                      disabled={busy === p.id}
                    >
                      Vincularme
                    </button>
                  )}
                  {puedoGestionar && (
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: "0.75rem", padding: "0.35rem 0.7rem" }}
                      onClick={() => setLinkTarget(p)}
                      disabled={busy === p.id}
                    >
                      Vincular a…
                    </button>
                  )}
                  {puedoGestionar && p.authUserId && (
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: "0.75rem", padding: "0.35rem 0.7rem" }}
                      onClick={() => desvincular(p)}
                      disabled={busy === p.id}
                    >
                      Desvincular
                    </button>
                  )}
                  {puedoGestionar && (
                    <>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: "0.75rem", padding: "0.35rem 0.7rem" }}
                        onClick={() => setEditing(p)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: "0.75rem", padding: "0.35rem 0.7rem" }}
                        onClick={() => setReassignSource(p)}
                        disabled={busy === p.id}
                      >
                        Reasignar todo
                      </button>
                      <button
                        className="btn"
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.35rem 0.7rem",
                          color: "var(--danger)",
                        }}
                        onClick={() => eliminar(p)}
                        disabled={busy === p.id}
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal edición */}
      <Modal
        open={!!editing || creating}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        title={editing ? `Editar ${editing.nombre}` : "Nuevo socio"}
      >
        <SocioForm
          initial={editing}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      </Modal>

      {/* Modal vincular a miembro del equipo */}
      <Modal
        open={!!linkTarget}
        onClose={() => setLinkTarget(null)}
        title={linkTarget ? `Vincular ${linkTarget.nombre} a…` : ""}
        eyebrow="Equipo"
      >
        {linkTarget && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Elige quién del equipo es <strong>{linkTarget.nombre}</strong>. Si esa persona ya
              estaba vinculada a otro socio, se desvincula de ese automáticamente.
            </p>
            {miembros.filter((m) => m.activo).length === 0 ? (
              <p className="text-sm text-muted">
                Todavía no has creado a nadie en tu equipo.{" "}
                <a href="/equipo" className="underline">
                  Ve a Equipo
                </a>{" "}
                para agregar personas primero.
              </p>
            ) : (
              <div className="grid gap-2">
                {miembros
                  .filter((m) => m.activo)
                  .map((m) => (
                    <button
                      key={m.userId}
                      className="card text-left flex items-center justify-between"
                      onClick={() => vincularAMiembro(linkTarget, m.userId)}
                      disabled={busy !== null}
                      style={{ cursor: "pointer" }}
                    >
                      <div>
                        <div className="text-sm font-semibold">
                          {m.nombre ?? m.email}
                          {m.userId === linkTarget.authUserId && (
                            <span className="text-[0.65rem] text-accent ml-2">(actual)</span>
                          )}
                        </div>
                        <div className="text-xs text-muted">
                          {m.email} · {m.rol}
                        </div>
                      </div>
                      <IconUser size={14} />
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal reasignar */}
      <Modal
        open={!!reassignSource}
        onClose={() => setReassignSource(null)}
        title={reassignSource ? `Reasignar todo lo de ${reassignSource.nombre}` : ""}
      >
        {reassignSource && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Mueve todos los animales, gastos y tareas de{" "}
              <strong>{reassignSource.nombre}</strong> a otro socio. La operación
              es irreversible pero el conteo total no cambia.
            </p>
            <div className="grid gap-2">
              {socios
                .filter((p) => p.id !== reassignSource.id)
                .map((dest) => (
                  <button
                    key={dest.id}
                    className="card text-left flex items-center justify-between"
                    onClick={() => reasignarA(dest)}
                    disabled={busy !== null}
                    style={{ cursor: "pointer" }}
                  >
                    <div>
                      <div className="text-sm font-semibold">{dest.nombre}</div>
                      <div className="text-xs text-muted">
                        {dest.email} · {fmtPct(dest.participacionPct ?? 0)}
                      </div>
                    </div>
                    <IconUser size={14} />
                  </button>
                ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg py-2 px-1" style={{ background: "var(--surface-2)" }}>
      <div className="text-[0.6rem] font-mono uppercase tracking-wider text-subtle">
        {label}
      </div>
      <div className="text-base font-mono font-semibold mt-0.5 tabular-nums">
        {value}
      </div>
    </div>
  );
}

function SocioForm({
  initial,
  onSaved,
}: {
  initial: Propietario | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Propietario>(
    initial ?? {
      id: `p-${uid()}`,
      nombre: "",
      email: "",
      participacionPct: 0,
    }
  );

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    if (!form.email.trim()) {
      alert("El email es obligatorio");
      return;
    }
    updateCollection("propietarios", (list) => {
      const withoutOld = list.filter((p) => p.id !== form.id);
      return [...withoutOld, form];
    });
    onSaved();
  }

  return (
    <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormRow label="Nombre" required colspan={2}>
        <input
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />
      </FormRow>
      <FormRow label="Email" required colspan={2}>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </FormRow>
      <FormRow label="Participación %" required>
        <input
          type="number"
          step="0.1"
          min="0"
          max="100"
          value={form.participacionPct}
          onChange={(e) =>
            setForm({
              ...form,
              participacionPct: parseFloat(e.target.value) || 0,
            })
          }
        />
      </FormRow>
      <div className="md:col-span-2 flex justify-end gap-2 pt-2">
        <button type="submit" className="btn btn-primary">
          Guardar
        </button>
      </div>
    </form>
  );
}
