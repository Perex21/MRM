import Link from "next/link";
import { RidgeDivider } from "@/components/graphics/RidgeDivider";
import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { principles } from "@/content/profile";
import { getProject } from "@/content/projects";
import { section } from "@/content/sections";

const { chapter, title } = section("approach");

/**
 * Engineering approach. Each principle steps a little further from the left
 * edge than the last — the path diverging by degrees — and names the project
 * where the practice can be checked.
 */
export function Approach() {
  return (
    <section id="approach" aria-labelledby="approach-title" className="pt-section">
      <Container className="pb-section">
        <SectionHeading id="approach-title" chapter={chapter} eyebrow="Method" title={title}>
          <p>
            The unorthodox part is rarely the technology. It is being willing to question the obvious route:
            to ask what the problem really is, and to say plainly what a system cannot do.
          </p>
        </SectionHeading>

        <ol className="mt-14 md:mt-20">
          {principles.map((principle, index) => {
            const project = getProject(principle.seenIn.slug)!;
            return (
              <li key={principle.title} style={{ "--step": index } as React.CSSProperties}>
                <Reveal className="grid gap-x-12 gap-y-4 border-t border-line py-9 lg:ml-[calc(var(--step)*3.5%)] lg:grid-cols-12">
                  <p aria-hidden="true" className="font-display text-heading text-accent lg:col-span-1">
                    {index + 1}
                  </p>
                  <div className="lg:col-span-6">
                    <h3 className="font-display text-heading font-medium text-balance">{principle.title}</h3>
                    <p className="mt-3 max-w-prose text-fg-muted">{principle.body}</p>
                  </div>
                  <p className="border-l border-line pl-5 lg:col-span-5">
                    <span className="label block text-fg-faint">Seen in</span>
                    <Link
                      href={`/work/${project.slug}`}
                      className="link-draw mt-1 inline-flex min-h-11 items-center font-display text-lead hover:text-accent"
                    >
                      {project.title}
                    </Link>
                    <span className="block text-fg-muted">{principle.seenIn.note}</span>
                  </p>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </Container>
      <RidgeDivider to="paper" shape={1} />
    </section>
  );
}
