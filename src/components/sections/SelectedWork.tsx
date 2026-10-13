import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/motion/Reveal";
import { ProjectEntry } from "@/components/projects/ProjectEntry";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { projects } from "@/content/projects";

/** The project archive, on paper — the inverted surface that rises out of the hero. */
export function SelectedWork() {
  return (
    <section id="work" aria-labelledby="work-title" className="surface-paper relative -mt-px pt-12 pb-section md:pt-16">
      <Container>
        <SectionHeading id="work-title" chapter="02" eyebrow="Archive" title="Selected work">
          <p>
            Three projects open the archive. Full case studies are being written; until then, only
            confirmed details appear here.
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
