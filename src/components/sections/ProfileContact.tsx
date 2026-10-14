import { DivergenceMark } from "@/components/graphics/DivergenceMark";
import { BowDivider } from "@/components/graphics/BowDivider";
import { Container } from "@/components/layout/Container";
import { Magnetic } from "@/components/motion/Magnetic";
import { MaskedWords } from "@/components/motion/MaskedWords";
import { Reveal } from "@/components/motion/Reveal";
import { ActionLink, ExternalMark } from "@/components/ui/ActionLink";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { section } from "@/content/sections";
import { site } from "@/content/site";

const profile = section("profile");
const contact = section("contact");

/**
 * The Record — professional profile, on paper. The quietest scene: the world
 * is covered, nothing moves but the reveal, and the facts are easy to scan.
 * Its foot bows away into the landscape of the Destination.
 */
export function Profile() {
  const { person, links, resume } = site;

  return (
    <section id="profile" aria-labelledby="profile-title" className="surface-paper relative -mt-px">
      <Container className="pt-section pb-section">
        <SectionHeading id="profile-title" chapter={profile.chapter} eyebrow={profile.scene} title={profile.title}>
          <p>
            {person.name} is an {site.role.replace("&", "and")}. The work shown here spans security tooling,
            compliance automation and web engineering, and the code behind it is public wherever that is
            possible.
          </p>
        </SectionHeading>

        <Reveal className="mt-14 md:mt-20">
          <ul className="border-b border-line">
            {links.map((link) => (
              <li key={link.href} className="border-t border-line">
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group grid min-h-24 items-center gap-x-12 gap-y-1 py-6 transition-colors duration-(--duration-hover) hover:text-accent lg:grid-cols-12"
                >
                  <span className="font-display text-heading font-medium lg:col-span-3">{link.label}</span>
                  <span className="text-fg-muted lg:col-span-6">{link.note}</span>
                  <span className="label flex items-center gap-2 text-fg-faint lg:col-span-3 lg:justify-end">
                    {link.href.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "")}
                    <ExternalMark />
                  </span>
                </a>
              </li>
            ))}
            {resume && (
              <li className="border-t border-line py-6">
                <a href={resume} download className="link-draw font-display text-heading font-medium hover:text-accent">
                  Download résumé (PDF)
                </a>
              </li>
            )}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}

/**
 * The Destination — contact. The journey resolves: the world behind settles,
 * the path reaches the horizon and the sun stands where it ends. One clear
 * action, pointed at a destination the owner actually reads.
 */
export function Contact() {
  const { primary, email } = site.contact;
  const secondary = site.links.filter((link) => link.href !== primary.href);

  // Tall enough that the settled landscape and the sun stand below the invitation.
  return (
    <section id="contact" aria-labelledby="contact-title" className="min-h-svh pb-[clamp(12rem,38vh,22rem)]">
      {/* The Record's paper bends away, opening onto the settled landscape. */}
      <BowDivider />
      <Container className="pt-section">
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
          <p className="label flex items-start gap-3 text-fg-faint lg:col-span-3 lg:pt-4">
            <DivergenceMark variant="glyph" className="size-5 text-accent" />
            <span>
              {contact.chapter} — {contact.scene}
            </span>
          </p>

          <div className="lg:col-span-9">
            <h2 id="contact-title" className="font-display text-display font-medium text-balance normal-case">
              <MaskedWords text="Take the other path." />
            </h2>
            <Reveal delay={0.25}>
              <p className="mt-8 max-w-prose text-lead text-fg-muted">
                If you are hiring, building something that needs an engineer who questions the obvious route,
                or want to talk through one of these projects, send me a message on {primary.label}.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Magnetic>
                  <ActionLink href={primary.href}>{`Message me on ${primary.label}`}</ActionLink>
                </Magnetic>
                {email && (
                  <ActionLink href={`mailto:${email}`} variant="line">
                    {email}
                  </ActionLink>
                )}
                {secondary.map((link) => (
                  <ActionLink key={link.href} href={link.href} variant="line">
                    {link.label}
                  </ActionLink>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
