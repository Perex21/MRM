import Image from "next/image";
import Link from "next/link";
import { RollText } from "@/components/motion/RollText";
import { ExternalMark } from "@/components/ui/ActionLink";
import { InkName } from "./InkName";

/** One destination's content: the project as the visitor finds it there. */
export type StopData = {
  slug: string;
  number: string;
  /** The place in the realm, and how it is framed. */
  place: string;
  distance: string;
  title: string;
  /** The name as the brush writes it. */
  brushName: string;
  short: string;
  category: string;
  summary: string;
  highlights: string[];
  stack: string[];
  more: number;
  status: string;
  links: { label: string; href: string }[];
  /** A real image from the project itself, where one exists. */
  image?: { src: string; width: number; height: number; alt: string; caption: string };
};

type StopProps = {
  stop: StopData;
  level: "h2" | "h3";
  /** Write the name with the brush (in the realm) rather than set it in type (the atlas). */
  inked?: boolean;
  written?: boolean;
  onWritten?: () => void;
};

/**
 * A destination's details. In the realm the name is written in ink first
 * and the rest follows (see .realm-panel-part); in the atlas everything is
 * simply there. Every fact comes from src/content/projects.ts.
 */
export function Stop({ stop, level: Heading, inked, onWritten }: StopProps) {
  return (
    <>
      <p className="label text-fg-faint">
        <span className="text-accent">{stop.number}</span> · {stop.place}
      </p>
      <p className="mt-1 text-sm text-fg-faint italic">{stop.distance}</p>

      {inked ? (
        <>
          <InkName text={stop.brushName} onWritten={onWritten} className="mt-4" />
          <Heading id={`stop-${stop.slug}`} data-panel-heading tabIndex={-1} className="sr-only">
            {stop.title}
          </Heading>
        </>
      ) : (
        <Heading id={`stop-${stop.slug}`} className="mt-5 font-brush text-heading font-medium text-balance">
          {stop.title}
        </Heading>
      )}

      <div className="realm-panel-part">
        <p className="label mt-5 text-fg-faint">{stop.category}</p>
        <p className="mt-3 text-fg">{stop.summary}</p>

        {stop.image && (
          <figure className="mt-6">
            <Image
              src={stop.image.src}
              width={stop.image.width}
              height={stop.image.height}
              alt={stop.image.alt}
              sizes="(min-width: 1024px) 30rem, 90vw"
              className="block h-auto w-full"
            />
            <figcaption className="mt-2 text-sm text-fg-faint">{stop.image.caption}</figcaption>
          </figure>
        )}

        <ul className="mt-6 grid gap-2">
          {stop.highlights.map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-px w-4 shrink-0 bg-accent" />
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-6 font-mono text-[0.8125rem] text-fg-muted">
          <span className="sr-only">Built with </span>
          {stop.stack.join(" · ")}
          {stop.more > 0 && <span className="text-fg-faint"> · +{stop.more} more</span>}
        </p>
        <p className="label mt-5 text-fg-faint">{stop.status}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href={`/work/${stop.slug}`}
            className="group label inline-flex min-h-12 items-center gap-3 bg-cinnabar px-5 text-parchment transition-colors duration-(--duration-hover) hover:bg-cinnabar-hover"
          >
            <RollText>Read the case study</RollText>
            <span className="sr-only">: {stop.title}</span>
            <span aria-hidden="true">→</span>
          </Link>
          {stop.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="label link-draw inline-flex min-h-11 items-center gap-2 text-fg-muted hover:text-fg"
            >
              {link.label}
              <ExternalMark />
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
