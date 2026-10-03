import type { Metadata } from "next";

// El contenido lo pinta AuthGate (LandingPage seccion="preguntas"): esta ruta
// solo existe para la URL pública y su metadata.
export const metadata: Metadata = {
  title: "Preguntas frecuentes · RumeApp",
  description: "Respuestas sobre precios, seguridad de los datos, señal en el potrero, socios y trabajadores en RumeApp.",
  alternates: { canonical: "/preguntas" },
};

export default function Page() {
  return null;
}
