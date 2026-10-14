import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { RollText } from "@/components/motion/RollText";
import { Tilt } from "@/components/motion/Tilt";
import type { Project } from "@/content/projects";
import { ProjectArt } from "./ProjectArt";

type ProjectEntryProps = {
  project: Project;
  /** Zero-based position in the archive. */
  index: number;
};

/** How many stack items the row shows before summarising the rest. */
const STACK_PREVIEW = 5;

/**
 * One archive row: numeral, facts, then the project illustration.
 *
 * The title link is stretched over the whole row, so the row is one large
 * target for pointer and touch while remaining a single link for keyboards.
 * Hovering or focusing the row plays a coordinated sequence — a cinnabar rule
 * draws across the top, the numeral rolls, the title underlines, the stack
 * chips light up in turn, and the artwork opens to full bleed and plays its
 * own story. Nothing is revealed only on hover: every fact is visible at rest,
 * so touch and keyboard users read exactly the same row.
 */
export function ProjectEntry({ project, index }: ProjectEntryProps) {
  const number = String(index + 1).padStart(2, "0");
  const stack = project.stack.flatMap((group) => group.items);
  const shown = stack.slice(0, STACK_PREVIEW);
  const more = stack.length - shown.length;

  return (
    <article
      data-tilt-zone
      className="group relative grid gap-x-12 gap-y-8 border-t border-line py-10 md:grid-cols-12 md:py-14"
    >
      {/* Accent rule drawing across the row's top edge. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 -top-px h-px origin-left scale-x-0 bg-accent transition-transform duration-700 ease-settle group-focus-within:scale-x-100 group-hover:scale-x-100"
      />

      <p aria-hidden="true" className="font-display text-title text-accent md:col-span-2 lg:col-span-3">
        <RollText>{number}</RollText>
      </p>

      <div className="md:col-span-10 lg:col-span-5">
        <p className="label text-fg-faint">{project.category}</p>
        <h3 className="mt-3 font-display text-heading font-semibold text-balance">
          <Link
            href={`/work/${project.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-(--focus)"
          >
            <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-[position:0_100%] bg-no-repeat transition-[background-size] duration-500 ease-entrance group-focus-within:bg-[length:100%_1px] group-hover:bg-[length:100%_1px]">
              {project.title}
            </span>
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

        <p className="sr-only">Built with</p>
        <ul className="mt-7 flex flex-wrap gap-2 font-mono text-[0.8125rem]">
          {shown.map((item, i) => (
            <li
              key={item}
              className="border border-line px-2.5 py-1 transition-colors duration-300 group-focus-within:border-accent group-hover:border-accent"
              style={{ transitionDelay: `${i * 45}ms` }}
            >
              {item}
            </li>
          ))}
          {more > 0 && <li className="px-1 py-1 text-fg-faint">+{more} more</li>}
        </ul>

        <p className="label mt-7 text-fg-faint">{project.status}</p>
        <p
          aria-hidden="true"
          className="label mt-5 inline-flex items-center gap-3 border-b border-line pb-2 transition-colors duration-(--duration-hover) group-focus-within:border-current group-focus-within:text-accent group-hover:border-current group-hover:text-accent"
        >
          <RollText>Read the case study</RollText>
          <span className="transition-transform duration-500 ease-entrance motion-safe:group-hover:translate-x-2">→</span>
        </p>
      </div>

      <figure className="md:col-span-8 md:col-start-3 lg:col-span-4 lg:col-start-9">
        <Reveal variant="unveil">
          <div className="art-frame">
            <Tilt zone="[data-tilt-zone]">
              <ProjectArt slug={project.slug} alt={project.artAlt} className="art-zoom" />
            </Tilt>
          </div>
        </Reveal>
        <figcaption className="label mt-3 text-fg-faint">Illustration {number}</figcaption>
      </figure>
    </article>
  );
}
