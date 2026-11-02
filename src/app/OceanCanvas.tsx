"use client";

import { useEffect, useRef } from "react";

// Full-screen underwater backdrop drawn by one fragment shader:
// a depth gradient, two layers of drifting cellular caustics, swaying light shafts
// and a soft vignette. Rendered at reduced resolution (water is soft anyway) and
// paused when the tab is hidden. With reduced motion it draws a single still frame.

const VERT = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

// Distance between the nearest and second-nearest moving cell points.
// Near zero along cell borders, which is where caustic light concentrates.
float cellEdge(vec2 p, float t) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash2(n + g);
      o = 0.5 + 0.42 * sin(t + 6.2831 * o);
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; }
      else if (d < d2) { d2 = d; }
    }
  }
  return d2 - d1;
}

float caustics(vec2 p, float t) {
  p += 0.1 * sin(p.yx * 3.0 + t * 0.6);
  float a = 1.0 - smoothstep(0.0, 0.16, cellEdge(p * 4.2, t * 0.55));
  float b = 1.0 - smoothstep(0.0, 0.16, cellEdge(p * 5.6 + vec2(3.1, 1.7), t * 0.43 + 2.0));
  return pow(a * 0.6 + b * 0.6, 2.6);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  float t = uTime;

  vec3 deep = vec3(0.020, 0.050, 0.40);
  vec3 mid  = vec3(0.035, 0.12, 0.70);
  vec3 top  = vec3(0.15, 0.45, 0.98);
  vec3 col = mix(deep, mid, smoothstep(0.0, 0.62, uv.y));
  col = mix(col, top, smoothstep(0.55, 1.05, uv.y) * 0.85);

  // Surface glow up and to the right, where the light comes from.
  vec2 g = (uv - vec2(0.7, 1.08)) * vec2(aspect * 0.6, 1.5);
  col += vec3(0.12, 0.38, 0.62) * smoothstep(1.0, 0.0, length(g)) * 0.7;

  // Caustics, squashed vertically like a floor seen at an angle, stronger near the surface.
  vec2 cp = vec2(uv.x * aspect, uv.y * 1.7) + uMouse * 0.05;
  float c = caustics(cp, t);
  col += vec3(0.55, 0.88, 1.0) * c * (0.05 + 0.24 * smoothstep(0.15, 1.0, uv.y));

  // Slanted light shafts that slowly sway.
  float ang = (uv.x - 0.62) * aspect - (1.0 - uv.y) * 0.42;
  float rays = smoothstep(0.55, 1.0, sin(ang * 13.0 + sin(t * 0.21) * 1.4));
  rays += 0.7 * smoothstep(0.75, 1.0, sin(ang * 23.0 - t * 0.17 + 1.3));
  col += vec3(0.42, 0.72, 1.0) * rays * 0.13 * smoothstep(0.05, 1.0, uv.y);

  vec2 v = uv - vec2(0.58, 0.62);
  col *= 1.0 - 0.6 * dot(v, v);

  gl_FragColor = vec4(col, 1.0);
}
`;

export default function OceanCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return; // CSS gradient underneath stays as the fallback

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uMouse = gl.getUniformLocation(prog, "uMouse");

    const scale = 0.5;
    const resize = () => {
      const w = Math.max(2, Math.round(canvas.clientWidth * scale));
      const h = Math.max(2, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, w, h);
    };

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      mouse.tx = e.clientX / window.innerWidth - 0.5;
      mouse.ty = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onMove);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      resize();
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      gl.uniform1f(uTime, still ? 12 : (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, -mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!still) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    canvas.dataset.ready = "true";

    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !still) raf = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} className="ocean" aria-hidden="true" />;
}
