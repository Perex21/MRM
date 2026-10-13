import { DivergenceMark } from "@/components/graphics/DivergenceMark";
import { sections } from "@/content/sections";
import { site } from "@/content/site";
import { Container } from "./Container";

export function SiteFooter() {
  const { person, links } = site;

  return (
    <footer className="border-t border-line py-14">
      <Container className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="flex items-center gap-3 font-display text-heading">
            <DivergenceMark className="size-8" />
            {site.identity}
          </p>
          <p className="mt-4 text-fg-muted">
            Portfolio of {person.name}
            {person.nameIsProvisional && " (provisional name)"} — {site.role}.
          </p>
        </div>

        <nav aria-label="Footer" className="md:col-span-5 md:col-start-6">
          <ul className="grid items-start gap-x-8 sm:grid-cols-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="inline-flex min-h-12 items-center text-fg-muted hover:text-fg"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-2 md:text-right">
          {links.length > 0 && (
            <ul>
              {links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="inline-flex min-h-12 items-center text-fg-muted hover:text-fg">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <a href="#top" className="label inline-flex min-h-12 items-center text-fg-muted hover:text-fg">
            Back to top ↑
          </a>
        </div>
      </Container>
    </footer>
  );
}
