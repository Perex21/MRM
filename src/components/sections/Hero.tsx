import { HeroLandscape } from "@/components/graphics/HeroLandscape";
import { Container } from "@/components/layout/Container";
import { ActionLink } from "@/components/ui/ActionLink";
import { site } from "@/content/site";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

export function Hero() {
  const { person, contact } = site;

  return (
    <section id="top" aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {/* Sun disc: sits behind the title only, where parchment-on-cinnabar still reads. */}
      <div
        aria-hidden="true"
        className="anim-settle absolute top-[clamp(1.25rem,10vw,9.5rem)] right-(--spacing-gutter) -z-10 size-[clamp(6rem,18vw,16.5rem)] rounded-full bg-cinnabar md:right-[11vw]"
        style={delay(200)}
      />
      <HeroLandscape className="absolute inset-0 -z-10 size-full" />

      <Container className="relative flex min-h-[calc(92svh-var(--spacing-header))] flex-col pt-[clamp(2rem,6vh,5rem)] pb-[clamp(9rem,22vh,14rem)]">
        <p className="label anim-settle flex max-w-[13.75rem] flex-wrap items-center gap-x-3 gap-y-2 text-fg-muted sm:max-w-none">
          <span>Portfolio of {person.name}</span>
          {person.nameIsProvisional && (
            <span className="border border-line px-2 py-0.5 text-fg-faint">Provisional name</span>
          )}
        </p>

        <h1 id="hero-title" className="mt-8 font-display text-display font-medium uppercase">
          <span className="mask-line pl-[0.2em] text-[max(0.3em,0.9375rem)] tracking-[0.32em] text-fg-muted">
            <span>The</span>
          </span>
          <span className="mask-line" style={delay(80)}>
            <span>Unorthodox</span>
          </span>
          <span className="mask-line pl-[0.9em] md:pl-[1.4em]" style={delay(160)}>
            <span>Path</span>
          </span>
        </h1>

        <div className="anim-settle mt-10 max-w-prose" style={delay(450)}>
          <p className="label text-accent">{site.role}</p>
          <p className="mt-4 text-lead text-fg">{site.statement}</p>

          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <ActionLink href="#work">Explore the work</ActionLink>
            {contact.email && (
              <ActionLink href={`mailto:${contact.email}`} variant="line">
                Get in touch
              </ActionLink>
            )}
          </div>
        </div>

        <p
          aria-hidden="true"
          className="label anim-settle absolute top-[clamp(2rem,6vh,5rem)] right-(--spacing-gutter) hidden text-fg-faint [writing-mode:vertical-rl] lg:block"
          style={delay(600)}
        >
          01 — Introduction
        </p>
      </Container>
    </section>
  );
}
