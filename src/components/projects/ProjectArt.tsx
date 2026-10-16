import type { ReactNode } from "react";
import type { ProjectSlug } from "@/content/projects";
import { cn } from "@/lib/cn";

/**
 * Original illustration for each project. These are compositions on the
 * Divergence motif that hint at how each system works — they are artwork, not
 * screenshots, and are captioned as illustrations wherever they appear.
 *
 * `art-*` classes are hooks for hover choreography (see globals.css): each
 * composition tells its own short story when its container is hovered or
 * focused, and rests in its drawn state otherwise.
 */

const road = { stroke: "var(--color-silver-dim)", strokeDasharray: "2 8" } as const;
const line = { stroke: "var(--color-silver-dim)", strokeWidth: 1 } as const;
const path = { stroke: "var(--color-parchment)", strokeWidth: 1.5, strokeLinecap: "round" } as const;

/** Phishing: three inputs merge into one path; one stroke leaves and is caught. */
function SignalsArt() {
  return (
    <>
      <g fill="none">
        <path className="art-part art-strand" {...line} d="M0 70H86c44 0 40 50 84 50M0 120h170M0 170H86c44 0 40-50 84-50" />
        <path {...road} d="M170 120h150" />
        <path className="art-part art-branch" {...path} d="M170 120c44 0 62-30 92-58" />
      </g>
      {/* The scope: follows the pointer over the row, as the scanner follows a suspect link. */}
      <g className="art-follow art-scope">
        <circle className="art-part art-ring" cx="262" cy="62" r="24" fill="none" stroke="var(--color-cinnabar)" strokeWidth="1.5" />
        <circle className="art-part art-catch" cx="262" cy="62" r="6" fill="var(--color-cinnabar)" />
      </g>
      <g fill="var(--color-parchment)">
        <circle cx="170" cy="120" r="3.5" />
        <circle cx="14" cy="70" r="2" />
        <circle cx="14" cy="120" r="2" />
        <circle cx="14" cy="170" r="2" />
      </g>
    </>
  );
}

/** GST: two ledgers face each other; one row breaks alignment. On hover the rest close ranks. */
function LedgerArt() {
  const rows = [48, 76, 104, 160, 188];
  return (
    <>
      <path {...road} fill="none" d="M160 0v240" />
      <g fill="none" {...line}>
        <g className="art-part art-ledger-left">
          {rows.map((y, i) => (
            <path key={y} d={`M${44 + (i % 3) * 14} ${y}H142`} />
          ))}
          <path d="M58 132H142" />
        </g>
        <g className="art-part art-ledger-right">
          {rows.map((y, i) => (
            <path key={y} d={`M178 ${y}H${276 - ((i + 1) % 3) * 16}`} />
          ))}
        </g>
      </g>
      <g fill="var(--color-parchment)">
        {rows.map((y) => (
          <circle key={y} cx="160" cy={y} r="2.5" />
        ))}
      </g>
      <path className="art-part art-diverge art-branch" {...path} fill="none" d="M178 132c40 0 58-18 98-34" />
      {/* The audit line: runs down the ledgers with the pointer. */}
      <path className="art-follow art-scan" d="M30 120H290" stroke="var(--color-cinnabar-bright)" strokeWidth="1" />
      <rect className="art-part art-catch" x="153" y="125" width="14" height="14" fill="var(--color-cinnabar)" />
    </>
  );
}

/** ECHOSS: a line globe sends out rings; one ring breaks its circle. On hover the globe turns and the echo spreads. */
function EchoArt() {
  return (
    <>
      <g fill="none" {...line}>
        <circle cx="128" cy="124" r="50" stroke="var(--color-parchment)" strokeOpacity="0.8" />
        <g className="art-part art-meridians">
          <ellipse cx="128" cy="124" rx="20" ry="50" />
          <ellipse cx="128" cy="124" rx="38" ry="50" />
        </g>
        <ellipse cx="128" cy="124" rx="50" ry="17" />
        <path d="M82 104c30 12 62 12 92 0M82 144c30-12 62-12 92 0" />
        {/* The echo drifts against the globe as the pointer moves. */}
        <g className="art-follow art-drift">
          <circle className="art-part art-echo-1" cx="128" cy="124" r="72" strokeOpacity="0.55" />
          <circle className="art-part art-echo-2" cx="128" cy="124" r="94" {...road} strokeOpacity="0.6" />
        </g>
      </g>
      <path
        className="art-part art-branch"
        {...path}
        fill="none"
        d="M128 240A116 116 0 0 1 12 124 116 116 0 0 1 210 42c26 26 58 22 96-8"
      />
      <circle className="art-part art-catch" cx="210" cy="42" r="8" fill="var(--color-cinnabar)" />
    </>
  );
}

const art: Record<ProjectSlug, () => ReactNode> = {
  "hybrid-phishing-detection": SignalsArt,
  "gst-audit-compliance": LedgerArt,
  "echoss-studio": EchoArt,
};

type ProjectArtProps = {
  slug: ProjectSlug;
  alt: string;
  className?: string;
};

export function ProjectArt({ slug, alt, className }: ProjectArtProps) {
  const Composition = art[slug];
  return (
    <svg viewBox="0 0 320 240" role="img" aria-label={alt} className={cn("block aspect-4/3 w-full bg-ink", className)}>
      <path fill="var(--color-ink-raised)" d="M0 240v-30c50-14 90 8 150-6s110-22 170-4v40z" />
      <Composition />
    </svg>
  );
}
