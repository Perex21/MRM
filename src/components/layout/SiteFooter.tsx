import Link from "next/link";
import { DivergenceMark } from "@/components/graphics/DivergenceMark";
import { ExternalMark } from "@/components/ui/ActionLink";
import { sections } from "@/content/sections";
import { site } from "@/content/site";
import { Container } from "./Container";

const linkClass = "link-draw inline-flex min-h-12 min-w-11 items-center gap-2 text-fg-muted hover:text-fg";

export function SiteFooter() {
  return (
    <footer className="border-t border-line py-14">
      <Container className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="flex items-center gap-3 font-display text-heading">
            <DivergenceMark className="size-8" />
            {site.identity}
          </p>
          <p className="mt-4 max-w-prose text-fg-muted">
            Portfolio of {site.person.name}, {site.role}.
          </p>
        </div>

        <nav aria-label="Footer" className="md:col-span-4 md:col-start-7">
          <ul className="grid grid-cols-2 gap-x-8">
            {sections.map((section) => (
              <li key={section.id}>
                <Link href={`/#${section.id}`} className={linkClass}>
                  {section.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <ul className="md:col-span-2">
          {site.links.map((link) => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {link.label}
                <ExternalMark />
              </a>
            </li>
          ))}
          <li>
            {/* "#top" with no matching id scrolls to the top of any page. */}
            <a href="#top" className={linkClass}>
              Back to top <span aria-hidden="true">↑</span>
            </a>
          </li>
        </ul>
      </Container>
    </footer>
  );
}
