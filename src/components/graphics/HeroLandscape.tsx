import { cn } from "@/lib/cn";

/**
 * Hero landscape: receding ridgelines with the Divergence drawn at landscape
 * scale — a dashed straight road and a path that leaves it. The nearest ridge
 * is parchment, so the paper of the next section rises into the hero.
 * Decorative. The cinnabar disc is positioned separately in Hero so it never
 * lands behind body text when this artwork is cropped.
 */
export function HeroLandscape({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none", className)}
    >
      <defs>
        <linearGradient id="hero-ridge-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-ink-mist)" />
          <stop offset="0.6" stopColor="var(--color-ink)" />
        </linearGradient>
        <linearGradient id="hero-ridge-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-ink-raised)" />
          <stop offset="0.7" stopColor="var(--color-ink)" />
        </linearGradient>
      </defs>

      <path
        fill="url(#hero-ridge-far)"
        d="M0 900V600c120-40 200-10 300-60s180-70 260-20 140 80 240 40 160-120 260-60 180 100 260 60 80-20 120 0v340z"
      />
      <path
        fill="url(#hero-ridge-mid)"
        d="M0 900V700c100-20 180-60 260-40s160 80 260 40 160-90 260-50 160 90 260 50 180-80 260-40 100 40 140 20v220z"
      />

      {/* Below md the crop leaves only a stray fragment of these lines, which
          cuts across the role statement — so they are shown from md up. */}
      <g className="hidden md:block">
        {/* The orthodox road: straight, dashed, uninterrupted. */}
        <path
          d="M380 900V0"
          fill="none"
          stroke="var(--color-silver-dim)"
          strokeWidth="1"
          strokeDasharray="2 10"
          vectorEffect="non-scaling-stroke"
        />
        {/* The path that leaves it. */}
        <path
          d="M380 900c20-60 140-80 220-130s-40-70 80-110 220-20 180-80 140-60 200-80"
          pathLength={1}
          fill="none"
          stroke="var(--color-parchment)"
          strokeOpacity="0.75"
          strokeWidth="1.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="anim-draw"
          style={{ "--delay": "500ms" } as React.CSSProperties}
        />
      </g>

      <path
        fill="var(--color-parchment)"
        d="M0 901V800c160-30 300 30 460 0s300-60 460-20 280 60 520-10v131z"
      />
    </svg>
  );
}
