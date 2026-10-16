import { Magnetic } from "@/components/motion/Magnetic";
import { ActionLink } from "@/components/ui/ActionLink";
import { Atmosphere } from "@/components/world/Atmosphere";
import { site } from "@/content/site";

/**
 * The Arrival — the landing scene.
 *
 * A tall section with one sticky viewport inside it. Nothing but the living
 * landscape (Atmosphere) for the first three seconds: no navigation, no text.
 * Then the name alone emerges through the mist as the gust crosses it. Only
 * when the visitor starts scrolling does the rest arrive — the header, the
 * role, the statement and the actions — and further scrolling carries the
 * camera up and into the clouds, which close into the parchment of the
 * Archive below.
 *
 * Choreography is CSS (see "The Arrival" in globals.css): the opening is
 * time-based from page load; everything after it is scroll-driven
 * (animation-timeline: scroll()), so it needs no JavaScript and follows the
 * visitor's own scrolling in both directions. Browsers without scroll-driven
 * animations, and reduced motion, get the composition at rest with everything
 * visible.
 */
export function Hero() {
  const { person, contact } = site;
  const words = person.name.toUpperCase().split(" ");
  let letterIndex = 0;

  return (
    <section id="top" data-landing aria-labelledby="hero-title" className="relative -mt-(--spacing-header) h-[300svh]">
      <div className="sticky top-0 h-svh overflow-hidden">
        <Atmosphere sectionId="top" className="absolute inset-0 size-full" />

        {/* Dark at the first instant; the landscape is uncovered beneath it. */}
        <div aria-hidden="true" className="arrival-veil pointer-events-none absolute inset-0 bg-ink" />

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-gutter pt-(--spacing-header)">
          <div className="arrival-stack flex flex-col items-center text-center *:pointer-events-auto">
            <h1 id="hero-title" className="arrival-name font-display text-name font-medium tracking-[0.03em] uppercase">
              <span className="sr-only">{person.name}</span>
              <span aria-hidden="true" className="arrival-unveil relative inline-block px-[0.1em] py-[0.08em]">
                {words.map((word, w) => (
                  <span key={w}>
                    <span className="inline-block whitespace-nowrap">
                      {[...word].map((char) => {
                        const index = letterIndex++;
                        return (
                          <span key={index} className="arrival-letter" style={{ "--i": index } as React.CSSProperties}>
                            {char}
                          </span>
                        );
                      })}
                    </span>
                    {w < words.length - 1 && " "}
                  </span>
                ))}
                <span className="arrival-mist" />
              </span>
            </h1>

            <div className="arrival-intro mt-[clamp(1.5rem,4vh,3rem)] flex max-w-[40rem] flex-col items-center">
              <p className="font-display text-heading text-fg-muted">{site.role}</p>
              <p className="mt-4 text-lead text-fg">{site.statement}</p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
                <Magnetic>
                  <ActionLink href="/#work">Explore the work</ActionLink>
                </Magnetic>
                <ActionLink href={contact.primary.href} variant="line">
                  {`Connect on ${contact.primary.label}`}
                </ActionLink>
              </div>
            </div>
          </div>
        </div>

        {/* The road, drawn down from the name once it has settled: an invitation to travel. */}
        <span aria-hidden="true" className="arrival-road pointer-events-none absolute bottom-0 left-1/2 h-[14vh] w-px bg-fg-faint" />

        {/* The cloud bank that closes into paper at the end of the journey. */}
        <div aria-hidden="true" className="arrival-cloudbank pointer-events-none absolute inset-0" />
      </div>
    </section>
  );
}
