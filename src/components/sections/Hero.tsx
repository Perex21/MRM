import { Seal } from "@/components/graphics/Seal";
import { Container } from "@/components/layout/Container";
import { Magnetic } from "@/components/motion/Magnetic";
import { ActionLink } from "@/components/ui/ActionLink";
import { site } from "@/content/site";

/** Delay measured from the opening gust (--gust-start), the shared clock of the Arrival. */
const atGust = (ms: number) => ({ "--delay": `calc(var(--gust-start) + ${ms}ms)` }) as React.CSSProperties;

/**
 * The Arrival. The landscape behind it is the fixed world layer (World); the
 * gust is drawn by WindGust. This section holds the composition the gust
 * resolves into.
 *
 * Sequence (all CSS, timed against --gust-start, so it plays and ends visible
 * without JavaScript; the canvas wind joins it when scripts are ready):
 *   ~0.3s  the brand line is wiped in from upwind
 *   ~0.6s  the gust front reaches the name: its letters are blown in one after
 *          another as the front passes, while a band of mist crosses them
 *   ~1.0s  the seal lands where the gust has passed
 *   ~1.3s  role, statement and actions settle into the stilled air
 *
 * The text container ignores pointer events and each text block opts back in
 * at its own width, so the seal stays pressable where the name passes over it.
 */
export function Hero() {
  const { person, contact } = site;
  const letters = [...person.name.toUpperCase()];

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {/* Sits behind the name only, where parchment-on-cinnabar still reads. */}
      <div
        className="anim-settle absolute top-[clamp(1.25rem,10vw,9.5rem)] right-(--spacing-gutter) size-[clamp(4.5rem,18vw,16.5rem)] md:right-[11vw]"
        style={atGust(850)}
      >
        <Seal className="size-full" />
        <p
          aria-hidden="true"
          className="label absolute top-full left-[62%] mt-4 hidden whitespace-nowrap text-fg-faint xl:block"
        >
          Press the seal
        </p>
      </div>

      {/* Phones: content starts below the seal. Wider: the composition is centred in the viewport. */}
      <Container className="pointer-events-none relative flex min-h-[calc(100svh-var(--spacing-header))] flex-col pt-[calc(clamp(1.25rem,10vw,9.5rem)+clamp(4.5rem,18vw,16.5rem)+1.25rem)] pb-[clamp(7rem,20vh,12rem)] *:pointer-events-auto md:justify-center md:pt-[clamp(2rem,6vh,5rem)]">
        <p
          className="anim-wipe w-fit font-display text-[clamp(1rem,2.1vw,1.75rem)] font-medium tracking-[0.42em] text-fg-muted uppercase"
          style={atGust(150)}
        >
          {site.identity}
        </p>

        <h1 id="hero-title" className="mt-5 w-fit font-display text-name font-medium uppercase">
          <span className="sr-only">{person.name}</span>
          <span aria-hidden="true" className="relative inline-block whitespace-nowrap">
            {letters.map((char, index) => (
              <span key={index} className="gust-letter" style={{ "--i": index } as React.CSSProperties}>
                {char === " " ? " " : char}
              </span>
            ))}
            <span className="gust-mist" />
          </span>
        </h1>

        <p className="anim-settle mt-6 font-display text-heading text-fg-muted" style={atGust(1000)}>
          {site.role}
        </p>

        <div className="anim-settle mt-8 max-w-prose" style={atGust(1150)}>
          <p className="text-lead text-fg">{site.statement}</p>

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
          style={atGust(1300)}
        >
          01 — The Arrival
        </p>
      </Container>
    </section>
  );
}
