"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Realm } from "./scene";
import { Stop, type StopData } from "./Stop";

/*
 * The Archive as a world: the visitor sees the realm from above the clouds,
 * descends through them onto a terrace, looks around, and travels along
 * golden routes to the three destinations, where a brush writes each
 * project's name and its details unfold.
 *
 * Structure: a tall track with a sticky stage. The first part of the track
 * drives the descent (a pure function of scroll, so it reverses exactly); the
 * rest holds the visitor on the terrace to explore before the page moves on.
 * Travel is chosen, not scrolled: a marker in the world or an entry in the
 * destination list flies the camera there.
 *
 * Everything readable is HTML: the destination list, the markers and the
 * arrival panel. The world itself (three.js, loaded on demand) is decoration
 * for assistive technology. Without JavaScript or WebGL the same destinations
 * are shown as an atlas, a plain list. Under reduced motion the world holds
 * still, the descent is skipped and the camera cuts instead of flying.
 */

type RealmExplorerProps = {
  stops: StopData[];
  chapter: string;
  scene: string;
  title: string;
};

/** The descent's share of the track, and the time on the terrace after it, in viewport heights. */
const DESCENT = 3;
const HOLD = 1.2;

const subscribe = () => () => {};
let webgl: boolean | null = null;
const hasWebGL = () => {
  if (webgl === null) {
    try {
      const c = document.createElement("canvas");
      webgl = Boolean(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webgl = false;
    }
  }
  return webgl;
};

export function RealmExplorer(props: RealmExplorerProps) {
  const canWorld = useSyncExternalStore(subscribe, hasWebGL, () => false);
  const prefersReducedMotion = useReducedMotion();
  if (!canWorld) return <Atlas {...props} />;
  return <World {...props} still={Boolean(prefersReducedMotion)} />;
}

/* ------------------------------------------------------------------ */
/* Without the world: the atlas                                        */
/* ------------------------------------------------------------------ */

function Atlas({ stops, chapter, scene, title }: RealmExplorerProps) {
  return (
    <div className="mx-auto max-w-page px-gutter pt-section pb-section">
      <Heading chapter={chapter} scene={scene} title={title} />
      <ol className="mt-14 grid gap-px bg-line lg:grid-cols-3">
        {stops.map((stop) => (
          <li key={stop.slug} className="surface-paper p-6 sm:p-8">
            <Stop stop={stop} level="h3" />
          </li>
        ))}
      </ol>
    </div>
  );
}

function Heading({ chapter, scene, title }: Omit<RealmExplorerProps, "stops">) {
  return (
    <>
      <p className="label text-gold">
        {chapter} — {scene}
      </p>
      <h2 id="work-title" className="mt-3 font-display text-title font-medium">
        {title}
      </h2>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* The world                                                           */
/* ------------------------------------------------------------------ */

type Phase = "veil" | "overview" | "entering" | "home" | "flight" | "arrived";

function World({ stops, chapter, scene, title, still }: RealmExplorerProps & { still: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markerRefs = useRef(new Map<string, HTMLButtonElement>());
  const railRefs = useRef(new Map<string, HTMLButtonElement>());
  const realmRef = useRef<Realm | null>(null);
  const descentRef = useRef(0);
  const arrivedRef = useRef<string | null>(null);
  const waiters = useRef<(() => void)[]>([]);

  const [arrived, setArrived] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    arrivedRef.current = arrived;
    // Keep what the camera looks at clear of the arrival panel: beside it on wide screens, above it on narrow ones.
    const wide = window.innerWidth >= 1024;
    realmRef.current?.setFrame(arrived ? (wide ? 0.2 : 0) : 0, arrived ? (wide ? 0 : 0.28) : 0);
  }, [arrived]);

  // Build the realm when the track comes near, run it while it is on screen.
  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!track || !stage || !canvas) return;

    let realm: Realm | null = null;
    let frame = 0;
    let visible = false;
    let disposed = false;
    let loading = false;

    const descentOf = () => {
      if (still) return 1;
      const rect = track.getBoundingClientRect();
      const range = (DESCENT * window.innerHeight) | 0;
      return Math.min(1, Math.max(0, -rect.top / range));
    };

    const sizeUp = () => {
      if (!realm) return;
      const narrow = window.innerWidth < 768;
      realm.resize(canvas.clientWidth, canvas.clientHeight, Math.min(window.devicePixelRatio || 1, narrow ? 1.25 : 1.5));
    };

    const loop = (now: number) => {
      if (!realm) return;
      const p = descentOf();
      descentRef.current = p;
      realm.setDescent(p);
      realm.render(now);

      // If the visitor scrolls back up out of the realm, close whatever was open.
      if (p < 0.999 && arrivedRef.current) {
        arrivedRef.current = null;
        setArrived(null);
        setBusy(false);
      }
      if (p >= 0.999 && waiters.current.length) {
        waiters.current.forEach((w) => w());
        waiters.current = [];
      }

      const at = realm.at;
      const phase: Phase =
        at === "flight"
          ? "flight"
          : at === "descent"
            ? p < 0.1
              ? "veil"
              : p < 0.5
                ? "overview"
                : "entering"
            : at === "home"
              ? "home"
              : "arrived";
      if (stage.dataset.phase !== phase) stage.dataset.phase = phase;

      const showMarkers = phase === "overview" || phase === "home";
      for (const a of realm.anchors()) {
        const el = markerRefs.current.get(a.slug);
        if (!el) continue;
        const on = showMarkers && a.visible;
        el.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
        if (el.dataset.on !== String(on)) el.dataset.on = String(on);
        // Near the top edge, the label hangs below its place instead of above it.
        const flip = String(a.y < 170);
        if (el.dataset.flip !== flip) el.dataset.flip = flip;
      }
      frame = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };

    const start = () => {
      if (!frame && visible && realm && !document.hidden) frame = requestAnimationFrame(loop);
    };

    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const { createRealm } = await import("./scene");
        if (disposed) return;
        const css = getComputedStyle(stage);
        const read = (name: string) => css.getPropertyValue(name).trim();
        realm = createRealm(canvas, {
          quality: window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4 ? "low" : "high",
          still,
          palette: {
            ink: read("--pv-ink"),
            jade: read("--pv-jade"),
            silver: read("--pv-silver"),
            parchment: read("--pv-parchment"),
            cinnabar: read("--pv-cinnabar"),
            gold: read("--pv-gold"),
          },
        });
        realmRef.current = realm;
        sizeUp();
        stage.dataset.ready = "true";
        start();
      } catch {
        setFailed(true);
      }
    };

    // Load as the visitor nears the realm, never during the landing's opening (its gust ends
    // by about six seconds); render only while the track is on screen.
    let waitTimer = 0;
    const loadSoon = () => {
      const wait = 6500 - performance.now();
      if (wait <= 0) load();
      else waitTimer = window.setTimeout(load, wait);
    };
    const near = new IntersectionObserver(([entry]) => entry.isIntersecting && loadSoon(), { rootMargin: "80% 0px" });
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    near.observe(track);
    seen.observe(track);
    const onVisibility = () => start();
    const onResize = () => sizeUp();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    const onLost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(waitTimer);
      near.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("webglcontextlost", onLost);
      realm?.dispose();
      realmRef.current = null;
    };
  }, [still]);

  // Looking around: drag (or swipe sideways) to turn; a mouse also leans the view a little.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let dragging: { x: number; y: number; lx: number; ly: number; id: number } | null = null;
    const base = { x: 0, y: 0 };
    const lean = { x: 0, y: 0 };
    const apply = () => realmRef.current?.setLook(base.x + lean.x, base.y + lean.y);
    const ignore = (target: EventTarget | null) => target instanceof Element && target.closest("button, a, [data-panel]");

    const down = (e: PointerEvent) => {
      if (ignore(e.target)) return;
      dragging = { x: e.clientX, y: e.clientY, lx: base.x, ly: base.y, id: e.pointerId };
    };
    const move = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      if (dragging && e.pointerId === dragging.id) {
        base.x = Math.max(-1, Math.min(1, dragging.lx - ((e.clientX - dragging.x) / rect.width) * 1.6));
        base.y = Math.max(-1, Math.min(1, dragging.ly + ((e.clientY - dragging.y) / rect.height) * (e.pointerType === "mouse" ? 1.2 : 0)));
      } else if (e.pointerType === "mouse") {
        lean.x = (((e.clientX - rect.left) / rect.width) * 2 - 1) * 0.12;
        lean.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1) * 0.12;
      }
      apply();
    };
    const up = (e: PointerEvent) => {
      if (dragging && e.pointerId === dragging.id) dragging = null;
    };
    const key = (e: KeyboardEvent) => {
      if (e.target !== stage) return;
      if (e.key === "ArrowLeft") base.x = Math.max(-1, base.x - 0.25);
      else if (e.key === "ArrowRight") base.x = Math.min(1, base.x + 0.25);
      else if (e.key === "ArrowUp") base.y = Math.min(1, base.y + 0.3);
      else if (e.key === "ArrowDown") base.y = Math.max(-1, base.y - 0.3);
      else return;
      e.preventDefault();
      apply();
    };
    stage.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    stage.addEventListener("keydown", key);
    return () => {
      stage.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      stage.removeEventListener("keydown", key);
    };
  }, []);

  /** Bring the visitor down onto the terrace first, if they chose a destination from above the clouds. */
  const descend = useCallback(() => {
    if (descentRef.current >= 0.999) return Promise.resolve();
    const track = trackRef.current!;
    const top = window.scrollY + track.getBoundingClientRect().top + DESCENT * window.innerHeight + 2;
    window.scrollTo({ top, behavior: still ? "instant" : "smooth" });
    return new Promise<void>((resolve) => waiters.current.push(resolve));
  }, [still]);

  const go = useCallback(
    async (slug: string) => {
      const realm = realmRef.current;
      if (!realm || busy) return;
      setBusy(true);
      realm.setFocus(slug);
      await descend();
      setArrived(null);
      await realm.travel(slug);
      realm.setFocus(null);
      setBusy(false);
      if (descentRef.current >= 0.999) setArrived(slug);
    },
    [busy, descend],
  );

  const home = useCallback(async () => {
    const realm = realmRef.current;
    if (!realm) return;
    const from = arrivedRef.current;
    setArrived(null);
    setBusy(true);
    await realm.travel("home");
    setBusy(false);
    if (from) railRefs.current.get(from)?.focus({ preventScroll: true });
  }, []);

  const focus = (slug: string | null) => realmRef.current?.setFocus(slug);
  const current = stops.find((s) => s.slug === arrived) ?? null;
  const next = current ? stops[(stops.indexOf(current) + 1) % stops.length] : null;

  if (failed) return <Atlas stops={stops} chapter={chapter} scene={scene} title={title} />;

  return (
    <div ref={trackRef} className="relative" style={{ height: `${100 + (still ? 0 : DESCENT * 100) + HOLD * 100}svh` }}>
      <div
        ref={stageRef}
        data-phase="veil"
        tabIndex={0}
        aria-label="The realm. Drag or use the arrow keys to look around; choose a destination from the list."
        className="realm-stage palette-vars sticky top-0 h-svh touch-pan-y overflow-hidden bg-ink outline-none select-none"
      >
        <canvas ref={canvasRef} aria-hidden="true" className="realm-canvas absolute inset-0 size-full" />

        {/* Soft edges where the realm meets the pages before and after it. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[10vh] bg-linear-to-b from-ink/70 to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[26vh] bg-linear-to-t from-ink/90 to-transparent" />

        <header className="realm-when-overview pointer-events-none absolute top-0 left-0 max-w-xl px-gutter pt-[clamp(1.5rem,6vh,4rem)]">
          <Heading chapter={chapter} scene={scene} title={title} />
          <p className="mt-4 max-w-sm text-fg-muted">
            Three projects, three places in one realm. Keep scrolling to descend through the clouds.
          </p>
        </header>
        <p className="realm-when-home pointer-events-none absolute inset-x-0 bottom-[calc(clamp(1rem,4vh,2.5rem)+4.5rem)] px-gutter text-center text-sm text-fg-muted">
          Look around — drag, swipe or use the arrow keys — then choose where to travel.
        </p>

        {/* Markers in the world. The list below is the keyboard's way to the same places. */}
        <div aria-hidden="true">
          {stops.map((stop) => (
            <button
              key={stop.slug}
              ref={(el) => {
                if (el) markerRefs.current.set(stop.slug, el);
              }}
              type="button"
              tabIndex={-1}
              data-on="false"
              onClick={() => go(stop.slug)}
              onPointerEnter={() => focus(stop.slug)}
              onPointerLeave={() => focus(null)}
              className="realm-marker group absolute top-0 left-0"
            >
              <span className="realm-marker-body flex -translate-x-1/2 -translate-y-full flex-col items-center">
                <span className="flex min-h-11 min-w-11 flex-col items-start justify-center border border-gold/35 bg-ink/75 px-3 py-2 text-left backdrop-blur-sm transition-colors duration-(--duration-hover) group-hover:border-gold md:px-4 md:py-2.5">
                  <span className="label text-gold">
                    {stop.number}
                    <span className="hidden md:inline"> · {stop.place}</span>
                  </span>
                  <span className="mt-1 hidden font-brush text-lg leading-tight text-parchment md:block">{stop.short}</span>
                </span>
                <span className="h-[clamp(1.5rem,5vh,3rem)] w-px bg-linear-to-b from-gold/70 to-gold/0" />
                <span className="size-2.5 rotate-45 border border-gold bg-ink transition-transform duration-(--duration-hover) group-hover:scale-150" />
              </span>
            </button>
          ))}
        </div>

        <nav aria-label="Destinations in the realm" className="realm-when-explore absolute inset-x-0 bottom-0 px-gutter pb-[clamp(1rem,4vh,2.5rem)]">
          <ol className="mx-auto flex max-w-page snap-x gap-2 overflow-x-auto sm:justify-center">
            {stops.map((stop) => (
              <li key={stop.slug} className="shrink-0 snap-start">
                <button
                  ref={(el) => {
                    if (el) railRefs.current.set(stop.slug, el);
                  }}
                  type="button"
                  onClick={() => go(stop.slug)}
                  onPointerEnter={() => focus(stop.slug)}
                  onPointerLeave={() => focus(null)}
                  onFocus={() => focus(stop.slug)}
                  onBlur={() => focus(null)}
                  aria-describedby={`realm-${stop.slug}-about`}
                  className="group flex min-h-12 items-baseline gap-3 border border-line bg-ink/70 px-4 py-3 text-left backdrop-blur-sm transition-colors duration-(--duration-hover) hover:border-gold focus-visible:border-gold"
                >
                  <span className="label text-gold">{stop.number}</span>
                  <span>
                    <span className="block font-display text-lg leading-tight text-parchment">{stop.place}</span>
                    <span id={`realm-${stop.slug}-about`} className="block text-sm text-fg-muted">
                      {stop.short}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <p aria-live="polite" className="sr-only">
          {busy && !arrived ? "Travelling." : current ? `Arrived at ${current.place}: ${current.title}.` : ""}
        </p>

        {current && (
          <ArrivalPanel
            key={current.slug}
            stop={current}
            next={next!}
            onHome={home}
            onNext={() => go(next!.slug)}
          />
        )}
      </div>
    </div>
  );
}

type ArrivalPanelProps = { stop: StopData; next: StopData; onHome: () => void; onNext: () => void };

/** What the visitor finds on arrival: the name written in ink, then the project itself. */
function ArrivalPanel({ stop, next, onHome, onNext }: ArrivalPanelProps) {
  const ref = useRef<HTMLElement>(null);
  const [written, setWritten] = useState(false);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[data-panel-heading]")?.focus({ preventScroll: true });
  }, []);

  return (
    <article
      ref={ref}
      data-panel
      data-written={written}
      aria-labelledby={`stop-${stop.slug}`}
      onKeyDown={(e) => e.key === "Escape" && onHome()}
      className="realm-panel surface-paper absolute inset-x-3 bottom-3 max-h-[78svh] overflow-y-auto overscroll-contain p-6 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.7)] sm:inset-x-6 sm:p-8 lg:inset-x-auto lg:top-[clamp(1rem,4vh,2.5rem)] lg:right-[clamp(1rem,3vw,3rem)] lg:bottom-[clamp(1rem,4vh,2.5rem)] lg:max-h-none lg:w-[min(32rem,40vw)]"
    >
      <Stop stop={stop} level="h3" written={written} onWritten={() => setWritten(true)} inked />

      <div className="realm-panel-part mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-line pt-6">
        <button type="button" onClick={onHome} className="label inline-flex min-h-11 items-center gap-2 text-fg-muted hover:text-fg">
          <span aria-hidden="true">←</span> Return to the realm
        </button>
        <button type="button" onClick={onNext} className="label inline-flex min-h-11 items-center gap-2 text-fg-muted hover:text-fg">
          Travel on to {next.place} <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
}
