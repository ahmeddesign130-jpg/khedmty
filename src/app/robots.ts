import type { MetadataRoute } from "next";

const siteUrl = "https://khedmty-swart.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/services"], disallow: ["/admin", "/api", "/account", "/provider", "/customer", "/pending", "/orders", "/checkout"] },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
