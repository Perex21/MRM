import Link from "next/link";
import { DivergenceMark } from "@/components/graphics/DivergenceMark";
import { sections } from "@/content/sections";
import { site } from "@/content/site";
import { Container } from "./Container";
import { MobileNav } from "./MobileNav";
import { NavLinks, type NavLink } from "./NavLinks";

// Root-relative hashes, so the same links work from case studies and the 404.
const links: NavLink[] = sections.map((section) => ({
  id: section.id,
  href: `/#${section.id}`,
  label: section.label,
  chapter: section.chapter,
}));

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur-sm">
      <Container className="flex h-(--spacing-header) items-center justify-between gap-3 lg:gap-6">
        <Link href="/" className="label inline-flex min-h-12 items-center gap-3">
          <DivergenceMark className="size-7" />
          <span className="whitespace-nowrap">{site.identity}</span>
        </Link>

        <nav aria-label="Sections" className="hidden lg:block">
          <NavLinks links={links} />
        </nav>

        <MobileNav links={links} />
      </Container>
    </header>
  );
}
