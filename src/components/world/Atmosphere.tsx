"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/*
 * The Arrival's living landscape, drawn by one fragment shader on raw WebGL
 * (no 3D library). Five mountain ranges recede into aerial haze; mist drifts
 * along the foot of each range at its own speed; clouds billow across the sky;
 * near wisps race past the camera. In the first seconds the fog is dense and
 * the ranges emerge through it; at ~2.4–4.2s a gust crosses the screen and
 * clears the air in front of the name. Scrolling then carries the camera up
 * and forward: the ranges part and fall away at different rates, the clouds
 * close in and brighten, and the view ends inside a parchment-white cloud bank
 * that becomes the paper of the Archive.
 *
 * Time is the navigation clock (performance.now()), the same origin as the CSS
 * name reveal, so the gust and the name stay in step even when scripts load late.
 *
 * Resilience: if WebGL is unavailable or the context is lost the canvas never
 * appears and the static World landscape behind it shows instead. Under reduced
 * motion a single still frame is drawn. The loop runs only while the landing
 * is on screen and the tab is visible, at a reduced internal resolution that
 * adapts down if frames run long.
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

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float cx = aspect * 0.5;
  float t = uTime;
  float s = uScroll;

  // The opening: fog thins over the first three seconds.
  float intro = smoothstep(0.2, 3.4, t);
  // The gust: crosses from left to right between 2.4s and 4.2s.
  float gp = clamp((t - 2.4) / 1.8, 0.0, 1.0);
  float gust = sin(gp * 3.14159);
  float gustX = mix(-0.7, aspect + 0.7, gp * gp * (3.0 - 2.0 * gp));
  // Wind pushes everything downwind; the gust adds a hard shove that stays.
  float push = gp * 1.6;
  // Scroll: rise first, then travel forward into the clouds.
  float travel = smoothstep(0.5, 1.0, s);

  // Sky: dark above, light held along the horizon, and a moonlit glow behind
  // where the name will stand, so the ranges read as backlit silhouettes.
  vec3 col = mix(MIST * 1.2, INK * 0.7, smoothstep(0.25, 1.0, uv.y));
  vec2 gd = (p - vec2(cx, 0.6 - s * 0.15)) * vec2(0.55, 1.0);
  float glow = exp(-dot(gd, gd) / 0.07);
  col += SILVER * 0.16 * glow * (0.35 + 0.65 * intro);

  // High clouds, billowing as they drift.
  vec2 cp = vec2(p.x * 1.1 - t * 0.05 - push * 0.35 + s * 0.4, p.y * 2.3 - s * 1.2);
  vec2 warp = vec2(fbm(cp * 0.8 + vec2(0.0, t * 0.05)), fbm(cp * 0.8 + vec2(5.2, -t * 0.03)));
  float c = fbm(cp + warp * 1.6);
  float sky = smoothstep(0.4, 0.85, uv.y + s * 0.15);
  float cloud = smoothstep(0.42, 0.84, c) * sky;
  // Clouds are lit from behind near the glow, darker away from it.
  vec3 cloudCol = mix(MIST * 1.8, SILVER * 0.5, c) + SILVER * 0.18 * glow;
  col = mix(col, cloudCol, cloud * 0.75);

  // Five ranges, far to near. Each has its own haze, drift, parallax and mist.
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float d = fi / 4.0;
    float zoom = 1.0 + travel * mix(0.12, 1.8, d);
    float x = (p.x - cx) / zoom + cx + s * mix(0.06, 0.55, d) + t * 0.003 * (1.0 + d * 2.0);
    float base = mix(0.5, 0.1, d) - s * mix(0.04, 0.3, d) - travel * mix(0.02, 0.55, d);
    float amp = mix(0.26, 0.17, d) * zoom;
    float h = base + amp * pow(ridge(x * mix(1.1, 2.3, d) + fi * 3.7, fi * 3.1), 1.7);
    float edge = p.y - h;
    float inside = 1.0 - smoothstep(-0.0015, 0.0025 + d * 0.002, edge);

    // Aerial perspective: far ranges pale into the mist; near ones are ink.
    vec3 tone = mix(MIST * 1.5, DEEP, pow(d, 0.7));
    tone = mix(tone, MIST * 2.0 + SILVER * 0.06 * glow, (1.0 - d) * 0.6);
    // Moonlight catching the ridgeline.
    tone += SILVER * 0.06 * exp(min(edge, 0.0) * 120.0) * (1.0 - d * 0.6);
    // The foot of each range dissolves into the mist below it.
    float foot = smoothstep(h - 0.24, h - 0.02, p.y);
    tone = mix(MIST * 1.45, tone, mix(1.0, foot, 0.7 - d * 0.3));
    col = mix(col, tone, inside);

    // Mist drifting along this range's foot, each band at its own speed.
    vec2 mp = vec2(p.x * mix(1.1, 2.4, d) - t * mix(0.018, 0.07, d) - push * mix(0.4, 1.2, d) + s * 0.6,
                   p.y * mix(5.0, 2.8, d) + fi * 2.3);
    float mn = fbm(mp + vec2(fbm(mp * 0.6 + t * 0.05), 0.0));
    float my = base + 0.03 + d * 0.02;
    float band = exp(-pow((p.y - my) / mix(0.05, 0.14, d), 2.0));
    float mist = band * smoothstep(0.34, 0.8, mn);
    col = mix(col, MIST * mix(2.8, 2.0, d) + SILVER * 0.08 * glow, mist * mix(0.6, 0.72, d) * (0.6 + 0.4 * intro));

    // A sea of cloud lies between the far ranges; the peaks rise out of it.
    if (i == 1) {
      vec2 sp = vec2(p.x * 1.6 - t * 0.03 - push * 0.6 + s * 0.3, p.y * 7.0);
      float sea = fbm(sp + vec2(fbm(sp * 0.5 - t * 0.04) * 1.2, 0.0));
      float seaBand = smoothstep(base + 0.1, base - 0.05, p.y) * smoothstep(base - 0.2, base - 0.05, p.y);
      col = mix(col, MIST * 2.5 + SILVER * 0.12 * glow, seaBand * smoothstep(0.35, 0.75, sea) * 0.7);
    }
  }

  // Fog of the opening: dense, moving, thinning as the land emerges.
  float fogN = fbm(vec2(p.x * 1.4 - t * 0.06 - push * 0.8, p.y * 2.2 + t * 0.02));
  float fog = (1.0 - intro) * (0.55 + 0.45 * fogN);
  col = mix(col, MIST * 1.55, clamp(fog, 0.0, 0.95));

  // The gust: a travelling band of pressure, streaked with wind and shoving mist.
  float gx = p.x - gustX + (p.y - 0.5) * 0.35;
  float gband = exp(-gx * gx / 0.16) * gust;
  float streak = fbm(vec2(p.x * 0.8 - t * 3.2, p.y * 26.0));
  col += SILVER * 0.22 * gband * smoothstep(0.55, 0.86, streak);
  float sheet = fbm(vec2(p.x * 2.2 - t * 2.4, p.y * 4.0));
  col = mix(col, MIST * 2.2, gband * 0.32 * smoothstep(0.35, 0.8, sheet));

  // Near wisps racing past the camera.
  float fw = fbm(vec2(p.x * 0.75 - t * 0.09 - push * 1.8, p.y * 1.7 + t * 0.025));
  float fmask = smoothstep(0.56, 0.86, fw) * smoothstep(0.55, 0.0, uv.y);
  col = mix(col, MIST * 2.0, fmask * 0.35);

  // Travelling forward: clouds open toward the camera and brighten into paper.
  vec2 q = (p - vec2(cx, 0.5)) / (1.0 + travel * 3.5);
  float ac = fbm(q * 2.6 + vec2(t * 0.03, s * 3.0));
  float approach = smoothstep(0.38, 0.78, ac) * travel;
  vec3 cloudTone = mix(MIST * 2.3, PARCH, smoothstep(0.7, 1.0, s));
  col = mix(col, cloudTone, approach * 0.85);

  // Vignette and a breath of grain, then the cloud bank closes into parchment.
  float vig = smoothstep(1.25, 0.35, length((uv - 0.5) * vec2(aspect * 0.75, 1.0)));
  col *= mix(0.72, 1.0, vig);
  col += (hash(gl_FragCoord.xy + floor(t * 24.0)) - 0.5) * 0.018;
  col = mix(col, PARCH, smoothstep(0.88, 1.0, s));

  gl_FragColor = vec4(col, 1.0);
}
`;

type AtmosphereProps = {
  /** Section whose scroll range drives the journey (its sticky height minus one viewport). */
  sectionId: string;
  className?: string;
};

export function Atmosphere({ sectionId, className }: AtmosphereProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    const section = document.getElementById(sectionId);
    if (!canvas || !section) return;

    // Development aid: `?arrival=<seconds>` holds the landscape at that moment of the opening
    // (and keeps the drawn frame, so screenshots of it are reliable).
    let held = NaN;
    if (process.env.NODE_ENV !== "production") {
      held = Number(new URLSearchParams(window.location.search).get("arrival") ?? NaN);
    }

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      depth: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: Number.isFinite(held),
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
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
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
    let quality = window.innerWidth < 768 ? 0.5 : 0.62;
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
      return range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 0;
    };

    let drawn = false;
    const draw = (now: number) => {
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      // Under reduced motion: one settled frame, after the fog has cleared and the gust has passed.
      gl.uniform1f(uTime, prefersReducedMotion ? 6 : Number.isFinite(held) ? held : now / 1000);
      gl.uniform1f(uScroll, prefersReducedMotion ? 0 : progress());
      gl.drawArrays(gl.TRIANGLES, 0, 3);
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
    const loop = (now: number) => {
      // Adapt: if frames keep running long, drop the internal resolution (down to a floor).
      const dt = now - last;
      last = now;
      if (samples < 90) {
        samples++;
        if (dt > 24) slow++;
        if (samples === 90 && slow > 30 && quality > 0.36) {
          quality *= 0.75;
          samples = 0;
          slow = 0;
        }
      }
      draw(now);
      frame = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (!frame && visible && !document.hidden) {
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
  }, [sectionId, prefersReducedMotion]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"} ${className ?? ""}`}
    />
  );
}
