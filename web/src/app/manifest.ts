import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RumeApp · Gestión ganadera",
    short_name: "RumeApp",
    description: "Su finca en el celular: ganado, cabras, ovejas, caballos, cerdos y aves.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "es-CO",
    background_color: "#F8F5EE",
    theme_color: "#14261A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
