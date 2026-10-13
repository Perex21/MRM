import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { plannedSections } from "@/content/sections";
import { site } from "@/content/site";

/**
 * Index of sections that are planned but not yet written. Each row owns the
 * section's anchor id, so navigation already works and nothing is fabricated.
 * As a section gains real content it moves out of here into its own component.
 */
export function FurtherChapters() {
  const { email } = site.contact;

  return (
    <section aria-labelledby="chapters-title" className="py-section">
      <Container>
        <SectionHeading id="chapters-title" chapter="03–06" eyebrow="Ahead" title="Further chapters">
          <p>
            The rest of the path is being written. These sections will open as their content is
            verified.
          </p>
        </SectionHeading>

        <ul className="mt-14 border-b border-line md:mt-20">
          {plannedSections.map((section) => (
            <li key={section.id} id={section.id}>
              <Reveal className="grid gap-x-12 gap-y-3 border-t border-line py-8 lg:grid-cols-12">
                <p className="label text-fg-faint lg:col-span-3 lg:pt-2">Chapter {section.chapter}</p>
                <div className="lg:col-span-6">
                  <h3 className="font-display text-heading font-medium">{section.title}</h3>
                  <p className="mt-2 max-w-prose text-fg-muted">{section.plan}</p>
                  {section.id === "contact" && email && (
                    <a
                      href={`mailto:${email}`}
                      className="mt-3 inline-flex min-h-12 items-center underline underline-offset-4 hover:text-accent"
                    >
                      {email}
                    </a>
                  )}
                </div>
                <p className="label text-fg-faint lg:col-span-3 lg:pt-2 lg:text-right">In preparation</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
