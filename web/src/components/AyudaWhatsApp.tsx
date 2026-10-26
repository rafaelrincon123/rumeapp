import { WHATSAPP_ICONO, WHATSAPP_URL } from "@/lib/contacto";

/** Tarjeta de ayuda con el WhatsApp de RumeApp (en /plan y /cuenta). */
export default function AyudaWhatsApp({ texto }: { texto: string }) {
  return (
    <div className="card flex items-center justify-between gap-3 flex-wrap">
      <div>
        <div className="text-sm font-semibold">¿Necesita ayuda?</div>
        <p className="text-xs text-muted mt-0.5">{texto}</p>
      </div>
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn"
        style={{ background: "#25D366", color: "white", borderColor: "#25D366" }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d={WHATSAPP_ICONO} />
        </svg>
        Escribir por WhatsApp
      </a>
    </div>
  );
}
