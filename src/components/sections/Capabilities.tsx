import Link from "next/link";
import { BowDivider } from "@/components/graphics/BowDivider";
import { RidgeDivider } from "@/components/graphics/RidgeDivider";
import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { capabilityGroups } from "@/content/profile";
import { getProject } from "@/content/projects";
import { section } from "@/content/sections";
import { site } from "@/content/site";

const { chapter, title, scene } = section("capabilities");

/**
 * The Disciplines — technical capabilities, as a row of hanging scrolls on
 * the ink landscape. The Archive's paper bows down into this scene; each
 * discipline then unrolls from its rod, one after another, as it comes into
 * view. Every item links to the case studies that used it, so the list can be
 * checked rather than taken on trust.
 *
 * Wide screens hang all five side by side with the discipline's name written
 * down the scroll's edge; narrower screens stack them, name across the top.
 */
export function Capabilities() {
  return (
    <section id="capabilities" aria-labelledby="capabilities-title" className="relative">
      <BowDivider />
      <Container className="pt-section pb-section">
        <SectionHeading id="capabilities-title" chapter={chapter} eyebrow={scene} title={title}>
          <p>
            What I can discuss in detail, because I have built with it. Each entry points to the work that
            used it.
          </p>
        </SectionHeading>

        <ul className="mt-14 grid gap-x-7 gap-y-10 md:mt-20 md:grid-cols-2 xl:grid-cols-5">
          {capabilityGroups.map((group, index) => (
            <li key={group.group} className="flex flex-col">
              {/* The rod the scroll hangs from. */}
              <span aria-hidden="true" className="relative mx-[-0.375rem] block h-1.5 rounded-full bg-silver-dim">
                <span className="absolute top-1/2 -left-1 size-2.5 -translate-y-1/2 rounded-full bg-silver" />
                <span className="absolute top-1/2 -right-1 size-2.5 -translate-y-1/2 rounded-full bg-silver" />
              </span>

              <Reveal variant="unveil" delay={index * 0.09} className="flex-1">
                <div className="surface-paper flex h-full gap-4 px-5 pt-6 pb-9">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-heading font-medium xl:sr-only">{group.group}</h3>
                    <p className="mt-2 text-sm text-fg-muted xl:mt-0">{group.summary}</p>

                    <ul className="mt-5 border-t border-line">
                      {group.items.map((item) => (
                        <li key={item.name} className="border-b border-line py-3">
                          <span className="block font-medium">{item.name}</span>
                          <span className="mt-1 flex flex-wrap gap-x-4">
                            {item.usedIn.map((slug) => {
                              const project = getProject(slug)!;
                              return (
                                <Link
                                  key={slug}
                                  href={`/work/${slug}`}
                                  aria-label={`${item.name}, used in ${project.title}`}
                                  className="label link-draw inline-flex min-h-11 items-center text-fg-faint hover:text-accent"
                                >
                                  {project.short}
                                </Link>
                              );
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Wide screens: the name runs down the scroll's edge, as on a hanging scroll. */}
                  <p
                    aria-hidden="true"
                    className="hidden border-l border-line pl-3 font-display text-heading leading-none font-medium [writing-mode:vertical-rl] xl:block"
                  >
                    {group.group}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal className="mt-16 grid gap-x-12 gap-y-6 border-y border-line py-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h3 className="font-display text-heading font-medium">Currently exploring</h3>
            <p className="mt-2 max-w-prose text-fg-muted">
              Where my attention is going next. These are interests, not claims of finished work.
            </p>
          </div>
          <ul className="flex flex-wrap content-start gap-2 lg:col-span-8">
            {site.focus.map((item) => (
              <li key={item} className="border border-line px-3 py-2 font-mono text-sm">
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
      <RidgeDivider to="paper" />
    </section>
  );
}
