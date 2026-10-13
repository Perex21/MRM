import { DivergenceMark } from "@/components/graphics/DivergenceMark";
import { sections } from "@/content/sections";
import { site } from "@/content/site";
import { Container } from "./Container";
import { MobileNav } from "./MobileNav";

const links = sections.map((section) => ({
  href: `#${section.id}`,
  label: section.label,
  chapter: section.chapter,
}));

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur-sm">
      <Container className="flex h-(--spacing-header) items-center justify-between gap-6">
        <a href="#top" className="label inline-flex min-h-12 items-center gap-3">
          <DivergenceMark className="size-7" />
          <span>{site.identity}</span>
        </a>

        <nav aria-label="Sections" className="hidden md:block">
          <ul className="flex items-center gap-4">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="label inline-flex min-h-12 items-center px-2 text-fg-muted transition-colors duration-(--duration-hover) hover:text-fg"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <MobileNav links={links} />
      </Container>
    </header>
  );
}
