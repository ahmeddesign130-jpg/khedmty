import type { MetadataRoute } from "next";

const siteUrl = "https://khedmty-swart.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/services`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}
