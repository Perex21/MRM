import { HeroLandscape } from "@/components/graphics/HeroLandscape";
import { Seal } from "@/components/graphics/Seal";
import { Container } from "@/components/layout/Container";
import { Magnetic } from "@/components/motion/Magnetic";
import { ActionLink } from "@/components/ui/ActionLink";
import { site } from "@/content/site";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

/**
 * The Threshold. Layering, back to front: landscape, seal, then text.
 *
 * Opening sequence (all CSS, so it plays and ends visible without JavaScript):
 * label → title lines rise from their masks one after another → the seal
 * lands → the path walks the straight road, marks the point where it
 * diverges, and leaves for the seal → role, statement and actions settle.
 * The text container ignores pointer events and each text block opts back in
 * at its own width, so the seal stays pressable where the title passes over it.
 */
export function Hero() {
  const { person, contact } = site;

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <HeroLandscape className="absolute inset-0 -z-10" />

      {/* Sits behind the title only, where parchment-on-cinnabar still reads. */}
      <div
        className="anim-settle absolute top-[clamp(1.25rem,10vw,9.5rem)] right-(--spacing-gutter) size-[clamp(6rem,18vw,16.5rem)] md:right-[11vw]"
        style={delay(320)}
      >
        <Seal className="size-full" />
        <p
          aria-hidden="true"
          className="label absolute top-full left-[62%] mt-4 hidden whitespace-nowrap text-fg-faint xl:block"
        >
          Press the seal
        </p>
      </div>

      <Container className="pointer-events-none relative flex min-h-[calc(92svh-var(--spacing-header))] flex-col pt-[clamp(2rem,6vh,5rem)] pb-[clamp(9rem,22vh,14rem)] *:pointer-events-auto">
        <p className="label anim-settle w-fit max-w-[13.75rem] text-fg-muted sm:max-w-none">
          Portfolio of {person.name}
        </p>

        <h1
          id="hero-title"
          className="pointer-events-none! mt-8 font-display text-display font-medium uppercase *:pointer-events-auto *:w-fit"
        >
          <span className="mask-line pl-[0.2em] text-[max(0.3em,0.9375rem)] tracking-[0.32em] text-fg-muted">
            <span>The</span>
          </span>
          <span className="mask-line" style={delay(140)}>
            <span>Unorthodox</span>
          </span>
          <span className="mask-line ml-[0.9em] md:ml-[1.4em]" style={delay(280)}>
            <span>Path</span>
          </span>
        </h1>

        <div className="anim-settle mt-10 max-w-prose" style={delay(820)}>
          <p className="label text-accent">{site.role}</p>
          <p className="mt-4 text-lead text-fg">{site.statement}</p>

          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Magnetic>
              <ActionLink href="/#work">Explore the work</ActionLink>
            </Magnetic>
            <ActionLink href={contact.primary.href} variant="line">
              {`Connect on ${contact.primary.label}`}
            </ActionLink>
          </div>
        </div>

        <p
          aria-hidden="true"
          className="label anim-settle pointer-events-none! absolute top-[clamp(2rem,6vh,5rem)] right-(--spacing-gutter) hidden text-fg-faint [writing-mode:vertical-rl] lg:block"
          style={delay(1000)}
        >
          01 — Introduction
        </p>
      </Container>
    </section>
  );
}
