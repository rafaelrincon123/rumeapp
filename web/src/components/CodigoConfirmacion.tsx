"use client";

import { useState } from "react";
import { resendSignupEmail, verifySignupCode } from "@/lib/auth";

/**
 * Confirma el registro con el código de 6 dígitos que llega al correo, sin
 * salir de la página. Al verificarse, Supabase abre la sesión aquí mismo y el
 * AuthGate sigue solo (si había finca pendiente del wizard, la crea).
 * El enlace del mismo correo sigue funcionando como alternativa.
 */
export default function CodigoConfirmacion({
  email,
  inputClassName,
  botonClassName = "btn btn-primary justify-center",
}: {
  email: string;
  inputClassName?: string;
  botonClassName?: string;
}) {
  const [codigo, setCodigo] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reenvio, setReenvio] = useState<"idle" | "enviando" | "ok" | "error">("idle");
  const esMicrosoft = /@(hotmail|outlook|live|msn)\./i.test(email);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const limpio = codigo.replace(/\D/g, "");
    if (limpio.length < 6) {
      setError("Escriba los 6 números que le llegaron al correo.");
      return;
    }
    setVerificando(true);
    const res = await verifySignupCode(email, limpio);
    setVerificando(false);
    if (!res.ok) setError(res.error);
  }

  async function reenviar() {
    setReenvio("enviando");
    setError(null);
    const res = await resendSignupEmail(email);
    setReenvio(res.ok ? "ok" : "error");
  }

  return (
    <form onSubmit={confirmar} className="flex flex-col gap-3">
      <p className="text-sm">
        Le enviamos un <strong>código de 6 números</strong> a{" "}
        <strong className="break-all">{email}</strong>. Escríbalo aquí para entrar.
      </p>
      <div
        className="text-sm px-3 py-2.5 rounded-lg flex gap-2 items-start"
        style={{ background: "rgba(232, 176, 60, 0.16)", border: "1px solid rgba(232, 176, 60, 0.55)", color: "inherit" }}
      >
        <span aria-hidden>📩</span>
        <span>
          {esMicrosoft ? (
            <>
              <strong>Con Hotmail u Outlook el correo casi siempre llega a &quot;Correo no deseado&quot;.</strong>{" "}
              Búsquelo ahí, de <strong>noreply@rumea.app</strong>.
            </>
          ) : (
            <>
              <strong>¿No lo ve en la bandeja de entrada?</strong> Revise <strong>Spam</strong> o{" "}
              <strong>Correo no deseado</strong>. Llega de <strong>noreply@rumea.app</strong>.
            </>
          )}
        </span>
      </div>
      <input
        className={inputClassName}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={8}
        autoFocus
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
        placeholder="123456"
        aria-label="Código de confirmación"
        style={{ fontSize: "1.5rem", letterSpacing: "0.4em", textAlign: "center", fontFamily: "monospace" }}
      />
      {error && (
        <div className="text-sm px-3 py-2 rounded-lg" style={{ background: "rgba(217, 83, 79, 0.10)", color: "#B54B2A" }}>
          {error}
        </div>
      )}
      <button type="submit" className={botonClassName} disabled={verificando}>
        {verificando ? "Confirmando…" : "Confirmar y entrar"}
      </button>
      <p className="text-xs" style={{ opacity: 0.75 }}>
        También puede tocar el botón del correo en vez de escribir el código. Si lo encontró en
        no deseados, márquelo como &quot;No es correo no deseado&quot; para recibir bien los avisos.
      </p>
      <button
        type="button"
        className="text-sm underline font-semibold self-start disabled:opacity-60"
        onClick={reenviar}
        disabled={reenvio === "enviando" || reenvio === "ok"}
      >
        {reenvio === "enviando"
          ? "Reenviando…"
          : reenvio === "ok"
          ? "Listo, le enviamos un código nuevo"
          : "No me llegó, enviar otro código"}
      </button>
      {reenvio === "error" && (
        <p className="text-sm" style={{ color: "#B54B2A" }}>
          No pudimos reenviarlo ahora. Espere un minuto e intente de nuevo.
        </p>
      )}
    </form>
  );
}
