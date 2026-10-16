"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createGovernor, perfProbe } from "@/lib/frames";

/*
 * The Arrival's living landscape, drawn by one fragment shader on raw WebGL
 * (no 3D library). Five mountain ranges recede into aerial haze; mist drifts
 * along the foot of each range at its own speed; clouds billow across the sky.
 * Scrolling carries the camera up and, if `reach` allows, forward: the ranges
 * part and fall away at different rates, the clouds close in and brighten,
 * and the view ends inside a parchment-white cloud bank. The landing uses
 * only the rise (reach 0.45); the passage into the Archive takes over from it.
 *
 * The wind is never drawn as lines or a band. It is seen only in what it
 * moves. In the first seconds a dense fog lies over the ranges; at 2.4s a gust
 * front crosses from left to right. Air ahead of the front is still; behind it
 * the air has been carried downwind, so every layer of mist, cloud and fog is
 * displaced by how far the front has passed it (and air at different heights
 * moves at different speeds, so the layers shear past one another). The fog is
 * churned, torn into wisps and blown off the valley; cloud streams off the lee
 * of the peaks; and in front of the name (the "front" layer, a second canvas
 * above the text) a wall of driven mist rolls across and rips into ribbons as
 * the name comes through it.
 *
 * Time is the navigation clock (performance.now()), the same origin as the CSS
 * name reveal, so the gust and the name stay in step even when scripts load late.
 *
 * Resilience: if WebGL is unavailable or the context is lost the canvas never
 * appears and the static World landscape behind it shows instead. Under reduced
 * motion the back layer draws a single still frame and the front layer draws
 * nothing. The back loop runs only while the landing is on screen and the tab
 * is visible; the front loop stops for good once the gust has passed. Both
 * render below screen resolution and adapt down if frames run long.
 */

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uTime;
uniform float uScroll;

const vec3 INK = vec3(0.063, 0.067, 0.063);
const vec3 DEEP = vec3(0.043, 0.047, 0.043);
const vec3 MIST = vec3(0.137, 0.149, 0.137);
const vec3 SILVER = vec3(0.663, 0.667, 0.639);
const vec3 PARCH = vec3(0.910, 0.878, 0.816);

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

// fbm without rotating its octaves, for textures stretched along the wind:
// rotated octaves would turn horizontal streaks into slanted and vertical ones.
float fbmx(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.1, 9.3);
    a *= 0.5;
  }
  return v;
}

// Ridged noise along one axis: sharp peaks, soft valleys.
float ridge(float x, float seed) {
  float v = 0.0;
  float a = 0.55;
  float f = 1.0;
  for (int i = 0; i < 5; i++) {
    float n = noise(vec2(x * f, seed + float(i) * 13.7));
    v += a * (1.0 - abs(n * 2.0 - 1.0));
    f *= 2.07;
    a *= 0.47;
  }
  return v;
}

float rangeHeight(float x, float fi, float d, float base, float amp) {
  return base + amp * pow(ridge(x * mix(1.1, 2.3, d) + fi * 3.7, fi * 3.1), 1.7);
}

// The gust: a ragged front crossing left to right between 2.4s and 4.6s.
//   rel  how far behind the front this point is (negative: the front has not reached it)
//   k    0 ahead of the front, 1 once it has fully passed
//   w    how hard the wind blows here now; strongest just behind the front, then easing
//   D    how far the air here has been carried downwind
void gustAt(vec2 p, float t, float aspect, out float rel, out float k, out float w, out float D) {
  if (t < 2.4) { rel = -1.0; k = 0.0; w = 0.0; D = 0.0; return; }
  if (t > 6.2) { rel = 4.0; k = 1.0; w = 0.0; D = 0.6; return; }
  float gp = clamp((t - 2.4) / 2.2, 0.0, 1.0);
  float front = mix(-0.7, aspect + 1.2, gp);
  // Air aloft runs ahead of air near the ground, and the front is never straight.
  float xf = p.x - (p.y - 0.5) * 0.15 + (fbm(vec2(p.y * 2.5 + 3.0, t * 0.6)) - 0.5) * 0.3;
  rel = front - xf;
  k = smoothstep(-0.05, 0.8, rel);
  w = smoothstep(-0.1, 0.05, rel) * exp(-max(rel, 0.0) * 1.4) * (1.0 - smoothstep(4.4, 6.0, t));
  D = 0.6 * k;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float cx = aspect * 0.5;
  float t = uTime;
  float s = uScroll;

  float rel, k, w, D;
  gustAt(p, t, aspect, rel, k, w, D);
  // Air at different heights is carried at different speeds, so layers shear.
  float shear = 0.9 + 0.2 * noise(vec2(p.y * 1.5, 4.1));
  // The light behind where the name stands; the mist catches it.
  vec2 gd = (p - vec2(cx, 0.6 - s * 0.15)) * vec2(0.55, 1.0);
  float glow = exp(-dot(gd, gd) / 0.07);

#ifdef FRONT
  // A wall of driven mist rolls across in front of the name, tearing into
  // ribbons behind its leading edge and thinning away as the wind eases.
  vec2 a = vec2(p.x - D * 1.6 * shear - t * 0.03, p.y);
  // Ribbons stretched along the wind, undulating as they go, churned, and
  // combed into fibres: that fibrous grain is what reads as wind, not cloud.
  float wave = (fbm(vec2(a.x * 0.9 - t * 0.15, 2.0)) - 0.5) * 0.35;
  vec2 r = vec2(a.x, (a.y + wave) * 7.0);
  r += vec2((fbm(r * vec2(0.6, 0.3) + t * 0.3) - 0.5) * 0.7,
            (fbm(r * vec2(0.5, 0.25) + vec2(4.7, -t * 0.4)) - 0.5) * 2.0);
  float n = fbmx(r);
  float fibres = fbmx(vec2(r.x * 3.0 - t * 0.8, r.y * 4.0));
  // Large gaps between the ribbons.
  float gaps = smoothstep(0.35, 0.65, fbm(vec2(a.x * 0.8 - t * 0.2, a.y * 1.6) + 7.0));
  float lead = smoothstep(-0.06, 0.12, rel + (n - 0.5) * 0.3);
  float body = lead * exp(-max(rel, 0.0) * 0.9) * (1.0 - smoothstep(4.8, 6.0, t));
  // Dense at the leading wall, tearing into ribbons behind it.
  float thr = mix(0.32, 0.64, clamp(rel / 1.2, 0.0, 1.0));
  float dens = smoothstep(thr, thr + 0.2, n) * mix(0.25, 1.0, fibres) * body * (0.35 + 0.65 * gaps);
  // It travels at the height of the ranges, thinning toward the sky.
  dens *= mix(0.15, 1.0, smoothstep(0.85, 0.45, uv.y));
  float alpha = clamp(dens * 0.85, 0.0, 1.0);
  // Thin edges catch the light behind; the body is grey.
  vec3 mc = MIST * 3.0 + SILVER * (0.1 + 0.25 * glow) + SILVER * 0.1 * (1.0 - smoothstep(0.0, 0.45, dens));
  gl_FragColor = vec4(mc * alpha, alpha);
#else
  float intro = smoothstep(0.2, 3.0, t);
  // Scroll: rise first, then travel forward into the clouds.
  float travel = smoothstep(0.5, 1.0, s);

  // Sky: dark above, light held along the horizon and behind the name, so the
  // ranges read as backlit silhouettes.
  vec3 col = mix(MIST * 1.2, INK * 0.7, smoothstep(0.25, 1.0, uv.y));
  col += SILVER * 0.16 * glow * (0.35 + 0.65 * intro);

  // High clouds, billowing as they drift; the gust churns and carries them.
  vec2 cp = vec2(p.x * 1.1 - t * 0.035 - D * 0.5 * shear + s * 0.4, p.y * 2.3 - s * 1.2);
  vec2 warp = vec2(fbm(cp * 0.8 + vec2(0.0, t * 0.05)), fbm(cp * 0.8 + vec2(5.2, -t * 0.03)));
  float c = fbm(cp + warp * (1.6 + w * 1.2));
  float sky = smoothstep(0.4, 0.85, uv.y + s * 0.15);
  float cloud = smoothstep(0.42, 0.84, c) * sky;
  vec3 cloudCol = mix(MIST * 1.8, SILVER * 0.5, c) + SILVER * 0.18 * glow;
  col = mix(col, cloudCol, cloud * 0.75);

  // Five ranges, far to near. Each has its own haze, drift, parallax and mist.
  // surf: depth of what this pixel sees (sky -0.4, far range 0, near range 1).
  float surf = -0.4;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float d = fi / 4.0;
    float zoom = 1.0 + travel * mix(0.12, 1.8, d);
    float x = (p.x - cx) / zoom + cx + s * mix(0.06, 0.55, d) + t * 0.003 * (1.0 + d * 2.0);
    float base = mix(0.5, 0.1, d) - s * mix(0.04, 0.3, d) - travel * mix(0.02, 0.55, d);
    float amp = mix(0.26, 0.17, d) * zoom;
    float h = rangeHeight(x, fi, d, base, amp);
    float edge = p.y - h;
    float inside = 1.0 - smoothstep(-0.0015, 0.0025 + d * 0.002, edge);

    // Aerial perspective: far ranges pale into the mist; near ones are ink.
    vec3 tone = mix(MIST * 1.5, DEEP, pow(d, 0.7));
    tone = mix(tone, MIST * 2.0 + SILVER * 0.06 * glow, (1.0 - d) * 0.6);
    // Light catching the ridgeline.
    tone += SILVER * 0.06 * exp(min(edge, 0.0) * 120.0) * (1.0 - d * 0.6);
    // The foot of each range dissolves into the mist below it. Measured from the
    // range's mean height, not its jagged ridge, or every peak smears downward.
    float mean = base + amp * 0.3;
    float foot = smoothstep(mean - 0.22, mean + 0.02, p.y);
    tone = mix(MIST * 1.45, tone, mix(1.0, foot, 0.7 - d * 0.3));
    col = mix(col, tone, inside);
    surf = mix(surf, d, inside);

    // Cloud streaming off the lee of the peaks, downwind of each summit. A
    // faint banner always flies; the gust tears it out long and bright.
    if (i < 3) {
      float lee = 0.05 + 0.12 * w;
      float hUp = rangeHeight(x - lee, fi, d, base, amp);
      float above = p.y - h;
      float region = smoothstep(-0.004, 0.02, hUp - p.y) * smoothstep(-0.03, 0.01, above) * smoothstep(0.1, 0.0, above);
      float bn = fbmx(vec2(x * 3.0 - t * 0.3 - D * 3.0, p.y * 30.0 - x * 2.0));
      float banner = region * smoothstep(0.42, 0.85, bn) * (0.25 + 0.75 * w);
      col = mix(col, MIST * 2.6 + SILVER * 0.12 * glow, banner * mix(0.55, 0.35, d));
    }

    // Mist along this range's foot, each band at its own speed; the gust
    // shoves it downwind, churns it and lifts it.
    vec2 mp = vec2(p.x * mix(1.1, 2.4, d) - t * mix(0.015, 0.05, d) - D * mix(0.8, 1.6, d) * shear + s * 0.6,
                   p.y * mix(5.0, 2.8, d) + fi * 2.3);
    float mn = fbmx(mp + vec2((fbm(mp * 0.6 + t * 0.05) - 0.5) * (1.0 + w * 0.4), 0.0));
    float my = base + 0.03 + d * 0.02 + w * 0.03;
    float band = exp(-pow((p.y - my) / mix(0.05, 0.14, d), 2.0));
    float mist = band * smoothstep(0.34, 0.8, mn);
    col = mix(col, MIST * mix(2.8, 2.0, d) + SILVER * 0.08 * glow, mist * mix(0.6, 0.72, d) * (0.6 + 0.4 * intro));

    // A sea of cloud lies between the far ranges; the peaks rise out of it.
    if (i == 1) {
      vec2 sp = vec2(p.x * 1.6 - t * 0.025 - D * 1.0 * shear + s * 0.3, p.y * 7.0);
      float sea = fbmx(sp + vec2(fbm(sp * 0.5 - t * 0.04) * (1.2 + w), 0.0));
      float seaBand = smoothstep(base + 0.1, base - 0.05, p.y) * smoothstep(base - 0.2, base - 0.05, p.y);
      col = mix(col, MIST * 2.5 + SILVER * 0.12 * glow, seaBand * smoothstep(0.35, 0.75, sea) * 0.7);
    }
  }

  // The opening fog: dense and slow, thinning as the land emerges; then the
  // gust churns it, tears it into wisps and carries it off the valley.
  vec2 fp = vec2(p.x * 1.3 - t * 0.04 - D * 2.2 * shear, p.y * 2.6 + t * 0.015);
  // Churned by the gust. A strong sideways warp would fold the fog into
  // vertical lines; the churn is mostly vertical, which combs it into streaks
  // along the wind. (The two warps are decorrelated, or it smears diagonally.)
  fp += vec2((fbm(fp * 0.7 + vec2(t * 0.1, 0.0)) - 0.5) * 0.7,
             (fbm(fp * 0.7 + vec2(5.2, 1.3 - t * 0.08)) - 0.5) * 0.9) * (0.6 + 0.9 * w);
  float fn = fbm(fp);
  // Fog hides what is far before what is near, so the ranges emerge near first.
  float thick = mix(0.97, 0.62, smoothstep(0.2, 2.4, t)) * (1.0 - 0.45 * clamp(surf, 0.0, 1.0));
  // Banks with body: gathered in the valleys, billowing, never a flat wash.
  float banks = clamp(0.3 + 1.6 * (fn - 0.42), 0.0, 1.0) * mix(1.0, 0.65, smoothstep(0.3, 0.9, uv.y));
  float torn = mix(banks, smoothstep(0.42 + 0.3 * k, 0.9, fn), k);
  float fog = thick * torn * (1.0 - 0.85 * k);
  // Lit fog: paler than the land, brightest where the light behind the name falls.
  vec3 fogCol = MIST * 2.2 + SILVER * (0.03 + 0.16 * glow) + SILVER * 0.12 * (fn - 0.45);
  col = mix(col, fogCol, clamp(fog, 0.0, 0.95));

  // Near wisps drifting past low in the view, carried on by the gust.
  float fw = fbm(vec2(p.x * 0.75 - t * 0.06 - D * 2.5 * shear, p.y * 1.7 + t * 0.025));
  float fmask = smoothstep(0.56, 0.86, fw) * smoothstep(0.55, 0.0, uv.y);
  col = mix(col, MIST * 2.0, fmask * 0.35);

  // Travelling forward: clouds open toward the camera and brighten into paper.
  vec2 tq = (p - vec2(cx, 0.5)) / (1.0 + travel * 3.5);
  float ac = fbm(tq * 2.6 + vec2(t * 0.03, s * 3.0));
  float approach = smoothstep(0.38, 0.78, ac) * travel;
  vec3 cloudTone = mix(MIST * 2.3, PARCH, smoothstep(0.7, 1.0, s));
  col = mix(col, cloudTone, approach * 0.85);

  // Vignette and a breath of grain, then the cloud bank closes into parchment.
  float vig = smoothstep(1.25, 0.35, length((uv - 0.5) * vec2(aspect * 0.75, 1.0)));
  col *= mix(0.72, 1.0, vig);
  col += (hash(gl_FragCoord.xy + floor(t * 24.0)) - 0.5) * 0.018;
  col = mix(col, PARCH, smoothstep(0.88, 1.0, s));

  gl_FragColor = vec4(col, 1.0);
#endif
}
`;

/** When the front layer has nothing left to draw (the driven mist is gone by 6s). */
const FRONT_END = 6.2;

type AtmosphereProps = {
  /** Section whose scroll range drives the journey (its sticky height minus one viewport). */
  sectionId: string;
  /** "back": the landscape. "front": the driven mist, drawn above the name during the gust. */
  layer?: "back" | "front";
  /**
   * How far along the journey the section's scroll range takes the camera (0–1).
   * Below 0.5 the camera only rises over the ranges; above it, it travels into the clouds.
   */
  reach?: number;
  className?: string;
};

export function Atmosphere({ sectionId, layer = "back", reach = 1, className }: AtmosphereProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    const section = document.getElementById(sectionId);
    if (!canvas || !section) return;
    const front = layer === "front";

    // Development aid: `?arrival=<seconds>` holds the landscape at that moment of the opening
    // (and keeps the drawn frame, so screenshots of it are reliable).
    let held = NaN;
    if (process.env.NODE_ENV !== "production") {
      held = Number(new URLSearchParams(window.location.search).get("arrival") ?? NaN);
    }
    const isHeld = Number.isFinite(held);

    // The driven mist is part of the gust: nothing to draw under reduced motion or once it has passed.
    if (front && (prefersReducedMotion || (!isHeld && performance.now() / 1000 > FRONT_END))) return;

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: front,
      premultipliedAlpha: true,
      depth: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: isHeld,
    });
    if (!gl) return;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl.FRAGMENT_SHADER, (front ? "#define FRONT\n" : "") + FRAGMENT);
    if (!vs || !fs) return;
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uScroll = gl.getUniformLocation(program, "uScroll");

    // Mist is soft, so the shader renders below screen resolution and is scaled up.
    const narrow = window.innerWidth < 768;
    let quality = front ? (narrow ? 0.38 : 0.45) : narrow ? 0.5 : 0.62;
    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * quality;
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const progress = () => {
      const rect = section.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      return (range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 0) * reach;
    };

    let drawn = false;
    let finished = false;
    const probe = perfProbe(front ? "landing-front" : "landing", gl);
    const draw = (now: number) => {
      // In development `window.__arrival` can move a held frame without reloading.
      const scrub = isHeld ? (window as unknown as { __arrival?: number }).__arrival : undefined;
      const time = prefersReducedMotion ? 7 : isHeld ? (scrub ?? held) : now / 1000;
      // The front layer has nothing to draw before the gust arrives; once it has passed,
      // the layer clears itself and stops for good.
      if (front && (time < 2.4 || time > FRONT_END)) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        finished = time > FRONT_END && !isHeld;
        return;
      }
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      // Under reduced motion: one settled frame, after the fog has cleared and the gust has passed.
      gl.uniform1f(uTime, time);
      gl.uniform1f(uScroll, prefersReducedMotion ? 0 : progress());
      if (probe) probe.time(() => gl.drawArrays(gl.TRIANGLES, 0, 3));
      else gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!drawn) {
        drawn = true;
        setReady(true);
      }
    };

    let frame = 0;
    let visible = true;
    let samples = 0;
    let slow = 0;
    let last = performance.now();
    // Paced to an even cadence of at least 60 fps (72 on a 144 Hz screen), not every refresh.
    const pace = createGovernor({ min: 1 });
    const loop = (now: number) => {
      if (!pace.due(now)) {
        frame = visible && !document.hidden && !finished ? requestAnimationFrame(loop) : 0;
        return;
      }
      pace.rendered(now);
      // Adapt: if frames keep running long, drop the internal resolution (down to a floor).
      const dt = now - last;
      last = now;
      if (samples < 90) {
        samples++;
        if (dt > 24) slow++;
        if (samples === 90 && slow > 30 && quality > 0.3) {
          quality *= 0.75;
          samples = 0;
          slow = 0;
        }
      }
      draw(now);
      frame = visible && !document.hidden && !finished ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (!frame && visible && !document.hidden && !finished) {
        last = performance.now();
        frame = requestAnimationFrame(loop);
      }
    };

    if (prefersReducedMotion) {
      frame = requestAnimationFrame(draw);
      const redraw = () => draw(performance.now());
      window.addEventListener("resize", redraw);
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", redraw);
      };
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    observer.observe(section);
    const onVisibility = () => start();
    document.addEventListener("visibilitychange", onVisibility);
    const onLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      frame = 0;
      setReady(false);
    };
    canvas.addEventListener("webglcontextlost", onLost);
    start();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
    };
  }, [sectionId, layer, reach, prefersReducedMotion]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"} ${className ?? ""}`}
    />
  );
}
