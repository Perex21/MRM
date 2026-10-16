import { RealmExplorer } from "@/components/realm/RealmExplorer";
import type { StopData } from "@/components/realm/Stop";
import { projects } from "@/content/projects";
import { section } from "@/content/sections";
import { DESTINATIONS } from "@/lib/realm";

const { chapter, title, scene } = section("work");

/** How many stack items a destination names before summarising the rest. */
const STACK_PREVIEW = 5;

/** A real image from the project, where one exists (see docs/CONTENT_INVENTORY.md). */
const images: Partial<Record<string, StopData["image"]>> = {
  "echoss-studio": {
    src: "/work/echoss/hero-poster.webp",
    width: 1920,
    height: 1080,
    alt: "A pale sphere hanging above dark water, rippling outward beneath it, under a warm haze.",
    caption: "The ECHOSS site's hero poster: a still rendered from its own globe shader, shown before the 3D scene loads.",
  },
};

const stops: StopData[] = projects.map((project, index) => {
  const place = DESTINATIONS.find((d) => d.slug === project.slug)!;
  const stack = project.stack.flatMap((group) => group.items);
  return {
    slug: project.slug,
    number: String(index + 1).padStart(2, "0"),
    place: place.place,
    distance: place.distance,
    title: project.title,
    brushName: project.brushName,
    short: project.short,
    category: project.category,
    summary: project.summary,
    highlights: project.highlights,
    stack: stack.slice(0, STACK_PREVIEW),
    more: Math.max(0, stack.length - STACK_PREVIEW),
    status: project.status,
    links: project.links,
    image: images[project.slug],
  };
});

/**
 * The Archive — the projects as places in a world the visitor can explore
 * (RealmExplorer). It follows the Arrival out of the same dark mist, and hands
 * on to the Path below.
 */
export function SelectedWork() {
  return (
    <section id="work" aria-labelledby="work-title" className="surface-ink relative">
      <RealmExplorer stops={stops} chapter={chapter} scene={scene} title={title} />
    </section>
  );
}
