import type { Project } from "@/content/projects";
import { ProjectPlate } from "./ProjectPlate";

type ProjectEntryProps = {
  project: Project;
  /** Zero-based position in the archive. */
  index: number;
};

/**
 * One archive row: numeral, title and verified facts, then the preview plate.
 * Optional facts (role, stack, outcomes, links) render only when present.
 */
export function ProjectEntry({ project, index }: ProjectEntryProps) {
  const number = String(index + 1).padStart(2, "0");

  return (
    <article className="grid gap-x-12 gap-y-8 border-t border-line py-10 md:grid-cols-12 md:py-14">
      <p aria-hidden="true" className="font-display text-title text-accent md:col-span-2 lg:col-span-3">
        {number}
      </p>

      <div className="md:col-span-10 lg:col-span-5">
        <p className="label text-fg-faint">{project.domain}</p>
        <h3 className="mt-3 font-display text-heading font-semibold text-balance">{project.title}</h3>
        <p className="mt-4 max-w-prose text-fg-muted">{project.summary}</p>

        <dl className="mt-8 grid gap-5">
          {project.role && <Fact term="Role">{project.role}</Fact>}
          {project.stack && (
            <Fact term="Stack">
              <ul className="flex flex-wrap gap-2 font-mono text-sm">
                {project.stack.map((item) => (
                  <li key={item} className="border border-line px-2 py-1">
                    {item}
                  </li>
                ))}
              </ul>
            </Fact>
          )}
          {project.outcomes && (
            <Fact term="Outcomes">
              <ul className="grid gap-1">
                {project.outcomes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Fact>
          )}
          <Fact term="Status">
            {project.caseStudyReady ? "Case study available" : "Case study in preparation"}
          </Fact>
        </dl>

        {project.links && (
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {project.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="label inline-flex min-h-12 items-center underline underline-offset-4 hover:text-accent"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="md:col-span-8 md:col-start-3 lg:col-span-4 lg:col-start-9">
        <ProjectPlate index={index} number={number} />
      </div>
    </article>
  );
}

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-4">
      <dt className="label text-fg-faint">{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}
