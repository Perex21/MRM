import { BowDivider } from "@/components/graphics/BowDivider";
import { Container } from "@/components/layout/Container";
import { principles } from "@/content/profile";
import { getProject } from "@/content/projects";
import { section } from "@/content/sections";
import { StickySteps, type Step } from "./StickySteps";

const { chapter, title, scene } = section("approach");

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
 * The Path — engineering approach. The world opens behind it as the visitor
 * walks on: the mist parts and the path winds further into the ranges. The
 * principles advance past an anchored heading and index, each naming the case
 * study where the practice can be checked. The Archive's paper bows down into
 * it from above.
 */
export function Approach() {
  return (
    <section id="approach" aria-labelledby="approach-title" className="relative">
      <BowDivider />
      <Container className="pt-section pb-section">
        <StickySteps
          headingId="approach-title"
          chapter={chapter}
          scene={scene}
          title={title}
          intro="The unorthodox part is rarely the technology. It is being willing to question the obvious route: to ask what the problem really is, and to say plainly what a system cannot do."
          steps={steps}
        />
      </Container>
    </section>
  );
}
