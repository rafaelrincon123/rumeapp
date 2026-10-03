import type { MetadataRoute } from "next";

// Solo las páginas públicas son indexables; todo lo demás está detrás del login.
// /_next y las imágenes (incluidas /app/, la pantalla de la portada) se permiten para que Google renderice la landing y
// Twitter/WhatsApp puedan leer la imagen de preview.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/$",
        "/funciones",
        "/precios",
        "/preguntas",
        "/terminos",
        "/privacidad",
        "/_next/",
        "/opengraph-image",
        "/twitter-image",
        "/*.png$",
        "/*.ico$",
        // Imágenes y videos de anuncios: Meta los descarga desde aquí.
        "/ads/",
        "/app/",
      ],
      disallow: "/",
    },
    sitemap: "https://rumea.app/sitemap.xml",
    host: "https://rumea.app",
  };
}
