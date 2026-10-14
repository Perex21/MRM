import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/motion/Reveal";
import { ProjectEntry } from "@/components/projects/ProjectEntry";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { projects } from "@/content/projects";
import { section } from "@/content/sections";

const { chapter, title } = section("work");

/**
 * The Archive, on paper — the surface that rises out of the hero. Its foot
 * bows down into the ink of the next section (see BowDivider in Approach).
 */
export function SelectedWork() {
  return (
    <section id="work" aria-labelledby="work-title" className="surface-paper relative -mt-px pt-12 md:pt-16">
      <Container className="pb-section">
        <SectionHeading id="work-title" chapter={chapter} eyebrow="Archive" title={title}>
          <p>
            Three projects, each with a full case study: what the problem was, how the system works, the
            decisions behind it, and where it falls short.
          </p>
        </SectionHeading>

        <ol className="mt-14 border-b border-line md:mt-20">
          {projects.map((project, index) => (
            <li key={project.slug}>
              <Reveal>
                <ProjectEntry project={project} index={index} />
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
