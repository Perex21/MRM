import Link from "next/link";
import type { ReactNode } from "react";
import { RidgeDivider } from "@/components/graphics/RidgeDivider";
import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/motion/Reveal";
import { ActionLink } from "@/components/ui/ActionLink";
import { projects, type Point, type Project } from "@/content/projects";
import { site } from "@/content/site";
import { Pipeline } from "./Pipeline";
import { ProjectArt } from "./ProjectArt";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

/** A full case study page: ink header, paper body, ink hand-off to the next project. */
export function CaseStudy({ project }: { project: Project }) {
  const index = projects.findIndex((p) => p.slug === project.slug);
  const number = String(index + 1).padStart(2, "0");
  const next = projects[(index + 1) % projects.length];
  const { study } = project;

  return (
    <article aria-labelledby="study-title">
      <header className="relative overflow-hidden">
        <Container className="grid gap-x-12 gap-y-12 pt-10 pb-section lg:grid-cols-12 lg:pt-16">
          <div className="lg:col-span-7">
            <Link href="/#work" className="label link-draw inline-flex min-h-12 items-center gap-3 text-fg-muted hover:text-fg">
              <span aria-hidden="true">←</span> Selected work
            </Link>

            <p className="label anim-settle mt-10 text-accent">
              Case study {number} — {project.category}
            </p>
            <h1 id="study-title" className="mt-5 font-display text-title font-medium text-balance">
              <span className="mask-line">
                <span>{project.title}</span>
              </span>
            </h1>
            <p className="anim-settle mt-6 max-w-prose text-lead text-fg-muted" style={delay(200)}>
              {project.summary}
            </p>

            <dl className="anim-settle mt-10 grid gap-5 border-t border-line pt-8" style={delay(300)}>
              <Fact term="Context">{project.context}</Fact>
              {project.role && <Fact term="Role">{project.role}</Fact>}
              <Fact term="Status">{project.status}</Fact>
            </dl>

            {project.links.length > 0 && (
              <div className="anim-settle mt-8 flex flex-wrap gap-x-8 gap-y-3" style={delay(380)}>
                {project.links.map((link) => (
                  <ActionLink key={link.href} href={link.href} variant="line">
                    {link.label}
                  </ActionLink>
                ))}
              </div>
            )}
          </div>

          <figure className="anim-settle lg:col-span-5 lg:pt-22" style={delay(250)}>
            <ProjectArt slug={project.slug} alt={project.artAlt} className="block aspect-4/3 w-full border border-line" />
            <figcaption className="label mt-3 text-fg-faint">Illustration, not a screenshot</figcaption>
          </figure>
        </Container>
        <RidgeDivider to="paper" />
      </header>

      <div className="surface-paper relative -mt-px">
        <Container className="pb-section">
          <StudySection index="01" label="Problem" title="What needed solving">
            <Prose paragraphs={study.problem} />
          </StudySection>

          <StudySection index="02" label="Flow" title="How it works">
            <Pipeline caption={study.pipeline.caption} stages={study.pipeline.stages} />
          </StudySection>

          <StudySection index="03" label="Architecture" title="How it is put together">
            <Points points={study.architecture} columns />
          </StudySection>

          <StudySection index="04" label="Decisions" title="Choices and trade-offs">
            <Points points={study.decisions} />
          </StudySection>

          <StudySection index="05" label="Evidence" title="Testing and evaluation">
            <Prose paragraphs={study.evaluation} />
          </StudySection>

          <StudySection index="06" label="Limits" title="What it does not do, and what comes next">
            <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
              <Checklist title="Limitations" items={study.limitations} />
              <Checklist title="Next steps" items={study.next} />
            </div>
          </StudySection>

          <StudySection index="07" label="Stack" title="Built with">
            <dl className="grid gap-x-12 gap-y-8 md:grid-cols-3">
              {project.stack.map((group) => (
                <div key={group.group}>
                  <dt className="label text-fg-faint">{group.group}</dt>
                  <dd className="mt-3">
                    <ul className="flex flex-wrap gap-2 font-mono text-sm">
                      {group.items.map((item) => (
                        <li key={item} className="border border-line px-2.5 py-1.5">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </StudySection>
        </Container>
        <RidgeDivider to="ink" shape={1} />
      </div>

      <nav aria-label="More work" className="py-section">
        <Container className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="label text-fg-faint">Next case study</p>
            <Link
              href={`/work/${next.slug}`}
              className="group mt-4 inline-block font-display text-title font-medium text-balance hover:text-accent"
            >
              <span className="link-draw">{next.title}</span>{" "}
              <span
                aria-hidden="true"
                className="inline-block transition-transform duration-(--duration-hover) ease-entrance motion-safe:group-hover:translate-x-2"
              >
                →
              </span>
            </Link>
          </div>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-4 lg:col-span-4 lg:justify-end">
            <ActionLink href="/#work" variant="line">
              All work
            </ActionLink>
            <ActionLink href={site.contact.primary.href} variant="line">
              Discuss on {site.contact.primary.label}
            </ActionLink>
          </div>
        </Container>
      </nav>
    </article>
  );
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-4">
      <dt className="label pt-0.5 text-fg-faint">{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

type StudySectionProps = { index: string; label: string; title: string; children: ReactNode };

function StudySection({ index, label, title, children }: StudySectionProps) {
  const id = `study-${label.toLowerCase()}`;
  return (
    <section aria-labelledby={id} className="grid gap-x-12 gap-y-8 border-t border-line py-12 first:border-t-0 md:py-16 lg:grid-cols-12">
      <header className="lg:col-span-3">
        <p className="label text-fg-faint">
          {index} — {label}
        </p>
        <h2 id={id} className="mt-3 font-display text-heading font-medium text-balance">
          {title}
        </h2>
      </header>
      <Reveal className="min-w-0 lg:col-span-9">{children}</Reveal>
    </section>
  );
}

function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="grid max-w-[44rem] gap-5 text-lead">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

function Points({ points, columns = false }: { points: Point[]; columns?: boolean }) {
  return (
    <ul className={columns ? "grid gap-x-12 gap-y-10 md:grid-cols-2" : "grid gap-10"}>
      {points.map((point) => (
        <li key={point.title} className="border-l border-accent pl-5">
          <h3 className="font-display text-lead font-semibold">{point.title}</h3>
          <p className="mt-2 max-w-prose text-fg-muted">{point.body}</p>
        </li>
      ))}
    </ul>
  );
}

function Checklist({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="label text-fg-faint">{title}</h3>
      <ul className="mt-4 grid gap-4">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span aria-hidden="true" className="mt-[0.7em] h-px w-4 shrink-0 bg-accent" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
