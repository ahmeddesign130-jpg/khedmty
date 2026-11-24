import type { MetadataRoute } from "next";

const siteUrl = "https://khedmty-swart.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/services`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  ];
}
