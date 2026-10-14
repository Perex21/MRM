import { BowDivider } from "@/components/graphics/BowDivider";
import { RidgeDivider } from "@/components/graphics/RidgeDivider";
import { Container } from "@/components/layout/Container";
import { principles } from "@/content/profile";
import { getProject } from "@/content/projects";
import { section } from "@/content/sections";
import { StickySteps, type Step } from "./StickySteps";

const { chapter, title } = section("approach");

const steps: Step[] = principles.map((principle) => {
  const project = getProject(principle.seenIn.slug)!;
  return {
    title: principle.title,
    body: principle.body,
    href: `/work/${project.slug}`,
    projectTitle: project.title,
    note: principle.seenIn.note,
  };
});

/**
 * Engineering approach. The paper of the archive bows down into this ink
 * section; the principles then advance past an anchored heading and index,
 * each naming the case study where the practice can be checked.
 */
export function Approach() {
  return (
    <section id="approach" aria-labelledby="approach-title" className="relative">
      <BowDivider />
      <Container className="pt-[calc(var(--spacing-section)*0.6)] pb-section">
        <StickySteps
          headingId="approach-title"
          chapter={chapter}
          title={title}
          intro="The unorthodox part is rarely the technology. It is being willing to question the obvious route: to ask what the problem really is, and to say plainly what a system cannot do."
          steps={steps}
        />
      </Container>
      <RidgeDivider to="paper" shape={1} />
    </section>
  );
}
