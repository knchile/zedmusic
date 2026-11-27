import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/data/catalog";
import { siteConfig } from "@/lib/site";

/** Static routes plus every public artist and release page. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/charts", priority: 0.9, changeFrequency: "weekly" },
    { path: "/charts/methodology", priority: 0.5, changeFrequency: "monthly" },
    { path: "/new-releases", priority: 0.8, changeFrequency: "daily" },
    { path: "/artists", priority: 0.7, changeFrequency: "daily" },
    { path: "/genres", priority: 0.5, changeFrequency: "weekly" },
    { path: "/about", priority: 0.4, changeFrequency: "monthly" },
    { path: "/legal/terms", priority: 0.2, changeFrequency: "yearly" },
    { path: "/legal/privacy", priority: 0.2, changeFrequency: "yearly" },
    { path: "/legal/upload-terms", priority: 0.2, changeFrequency: "yearly" },
    { path: "/legal/copyright", priority: 0.2, changeFrequency: "yearly" },
  ] as const;
  const { artists, releases } = await getSitemapEntries();
  return [
    ...routes.map((r) => ({ url: `${siteConfig.url}${r.path}`, changeFrequency: r.changeFrequency, priority: r.priority })),
    ...artists.map((a) => ({ url: `${siteConfig.url}/artist/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...releases.map((r) => ({ url: `${siteConfig.url}/release/${r.artistSlug}/${r.slug}`, lastModified: r.publishedAt ?? undefined, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
