import type { MetadataRoute } from "next";
import { projects } from "@/content/projects";
import { site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, priority: 1 },
    ...projects.map((project) => ({ url: `${site.url}/work/${project.slug}`, priority: 0.8 })),
  ];
}
