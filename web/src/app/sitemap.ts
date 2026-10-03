import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://rumea.app";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/funciones`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/precios`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/preguntas`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/terminos`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacidad`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
