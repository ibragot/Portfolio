"use client";

import { useEffect, useRef, useState } from "react";

// Draws the illustrated model with a small WebGL shader so the hair and shirt drift
// as if underwater while the face stays still. A motion map tells the shader how much
// each pixel moves: red = hair (strong, buoyant), green = shirt (gentle ripple).
// Falls back to a plain image without WebGL or with reduced motion.

const VERT = `
attribute vec2 a;
varying vec2 vUv;
void main() {
  vUv = vec2(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5);
  gl_Position = vec4(a, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;
uniform sampler2D uImg;
uniform sampler2D uMotion;
uniform float uTime;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec4 m = texture2D(uMotion, uv);
  float t = uTime;

  // Two slow layered waves travelling through the image; smooth and cheap.
  vec2 wave = vec2(
    sin(uv.y * 17.0 + t * 1.25) * 0.6 + sin(uv.y * 6.5 + uv.x * 4.0 - t * 0.8) * 0.4,
    cos(uv.x * 15.0 + t * 1.05) * 0.6 + sin(uv.x * 5.5 - uv.y * 3.0 + t * 0.7) * 0.4
  );

  vec2 off = wave * (m.r * 0.0075 + m.g * 0.0032);
  // Hair lifts a little, as if buoyant, and settles back.
  off.y -= m.r * 0.006 * (0.55 + 0.45 * sin(t * 0.85));
  // The shirt hem sways sideways.
  off.x += m.g * 0.004 * sin(t * 0.6 + uv.y * 3.0);

  gl_FragColor = texture2D(uImg, uv + off);
}
`;

export default function HeroModel() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFallback(true);
      return;
    }
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) {
      setFallback(true);
      return;
    }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      setFallback(true);
      return;
    }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFallback(true);
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "uTime");
    gl.uniform1i(gl.getUniformLocation(prog, "uImg"), 0);
    gl.uniform1i(gl.getUniformLocation(prog, "uMotion"), 1);

    const texture = (unit: number, img: HTMLImageElement, premultiply: boolean) => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      // Non-power-of-two textures: clamp and no mipmaps.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    };

    const load = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Could not load ${src}`));
        img.src = src;
      });

    // Phones get the lighter texture; larger screens get the sharper one for close-ups.
    const small = window.innerWidth < 900;
    let raf = 0;
    let cancelled = false;
    const start = performance.now();

    Promise.all([load(small ? "/images/nour-model-sm.webp" : "/images/nour-model.webp"), load("/images/nour-motion.png")])
      .then(([img, motion]) => {
        if (cancelled) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        texture(0, img, true);
        texture(1, motion, false);
        gl.clearColor(0, 0, 0, 0);
        canvas.dataset.ready = "true";
        const frame = (now: number) => {
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.uniform1f(uTime, (now - start) / 1000);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      })
      .catch(() => setFallback(true));

    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && canvas.dataset.ready) {
        const frame = (now: number) => {
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.uniform1f(uTime, (now - start) / 1000);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (fallback) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="hero-art" src="/images/nour-model.webp" alt="" width={1490} height={1404} />;
  }
  return <canvas ref={canvasRef} className="hero-art" width={1490} height={1404} />;
}
