import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/**
 * Static routes for now. Artist, release and track URLs are added in Phase 2
 * once public catalogue pages exist.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/charts", priority: 0.9, changeFrequency: "weekly" },
    { path: "/charts/methodology", priority: 0.5, changeFrequency: "monthly" },
    { path: "/about", priority: 0.4, changeFrequency: "monthly" },
    { path: "/legal/terms", priority: 0.2, changeFrequency: "yearly" },
    { path: "/legal/privacy", priority: 0.2, changeFrequency: "yearly" },
    { path: "/legal/upload-terms", priority: 0.2, changeFrequency: "yearly" },
    { path: "/legal/copyright", priority: 0.2, changeFrequency: "yearly" },
  ] as const;
  return routes.map((r) => ({
    url: `${siteConfig.url}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
