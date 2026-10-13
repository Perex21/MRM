import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { Tilt } from "@/components/motion/Tilt";
import type { Project } from "@/content/projects";
import { ProjectArt } from "./ProjectArt";

type ProjectEntryProps = {
  project: Project;
  /** Zero-based position in the archive. */
  index: number;
};

/**
 * One archive row: numeral, facts, then the project illustration.
 * The title link is stretched over the whole row, so the row is one large
 * target for pointer and touch while remaining a single link for keyboards.
 */
export function ProjectEntry({ project, index }: ProjectEntryProps) {
  const number = String(index + 1).padStart(2, "0");

  return (
    <article
      data-tilt-zone
      className="group relative grid gap-x-12 gap-y-8 border-t border-line py-10 md:grid-cols-12 md:py-14"
    >
      <p aria-hidden="true" className="font-display text-title text-accent md:col-span-2 lg:col-span-3">
        {number}
      </p>

      <div className="md:col-span-10 lg:col-span-5">
        <p className="label text-fg-faint">{project.category}</p>
        <h3 className="mt-3 font-display text-heading font-semibold text-balance">
          <Link
            href={`/work/${project.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-(--focus)"
          >
            {project.title}
          </Link>
        </h3>
        <p className="mt-4 max-w-prose text-fg-muted">{project.summary}</p>

        <ul className="mt-6 grid gap-2">
          {project.highlights.map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-px w-4 shrink-0 bg-accent" />
              {item}
            </li>
          ))}
        </ul>

        <p className="label mt-8 text-fg-faint">{project.status}</p>
        <p
          aria-hidden="true"
          className="label mt-5 inline-flex items-center gap-3 border-b border-line pb-2 transition-colors duration-(--duration-hover) group-hover:border-current group-hover:text-accent"
        >
          Read the case study
          <span className="transition-transform duration-(--duration-hover) ease-entrance motion-safe:group-hover:translate-x-1">
            →
          </span>
        </p>
      </div>

      <figure className="md:col-span-8 md:col-start-3 lg:col-span-4 lg:col-start-9">
        <Reveal variant="unveil">
          <Tilt zone="[data-tilt-zone]">
            <ProjectArt slug={project.slug} alt={project.artAlt} />
          </Tilt>
        </Reveal>
        <figcaption className="label mt-3 text-fg-faint">Illustration {number}</figcaption>
      </figure>
    </article>
  );
}
