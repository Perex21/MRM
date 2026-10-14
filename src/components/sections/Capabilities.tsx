import Link from "next/link";
import { RippleDivider } from "@/components/graphics/RippleDivider";
import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { capabilityGroups } from "@/content/profile";
import { getProject } from "@/content/projects";
import { section } from "@/content/sections";
import { site } from "@/content/site";

const { chapter, title } = section("capabilities");

/**
 * Technical capabilities, grouped by area. Every item links to the case
 * studies that use it, so the list can be checked rather than taken on trust.
 */
export function Capabilities() {
  return (
    <section id="capabilities" aria-labelledby="capabilities-title" className="surface-paper relative -mt-px">
      <Container className="py-section">
        <SectionHeading id="capabilities-title" chapter={chapter} eyebrow="Evidence" title={title}>
          <p>
            What I can discuss in detail, because I have built with it. Each entry points to the work that
            used it.
          </p>
        </SectionHeading>

        <div className="mt-14 md:mt-20">
          {capabilityGroups.map((group) => (
            <Reveal key={group.group} className="grid gap-x-12 gap-y-6 border-t border-line py-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <h3 className="font-display text-heading font-medium">{group.group}</h3>
                <p className="mt-2 max-w-prose text-fg-muted">{group.summary}</p>
              </div>

              <ul className="lg:col-span-8">
                {group.items.map((item) => (
                  <li
                    key={item.name}
                    className="flex flex-wrap items-center justify-between gap-x-6 border-b border-line py-2 first:border-t"
                  >
                    <span className="py-2 font-medium">{item.name}</span>
                    <span className="flex flex-wrap gap-x-5">
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
            </Reveal>
          ))}

          <Reveal className="grid gap-x-12 gap-y-6 border-y border-line py-10 lg:grid-cols-12">
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
        </div>
      </Container>
      <RippleDivider />
    </section>
  );
}
