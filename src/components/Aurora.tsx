"use client";

import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";

type AuroraProps = {
  colorStops?: string[];
  amplitude?: number;
  speed?: number;
  blend?: number;
};

export default function Aurora({
  colorStops = ["#00d4ff", "#7c3aed", "#1d4ed8"],
  amplitude = 1.4,
  speed = 0.6,
  blend = 0.7,
}: AuroraProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio, 2),
    });

    const gl = renderer.gl;
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    gl.canvas.style.display = "block";

    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);

    const program = new Program(gl, {
      vertex: `
        attribute vec2 position;
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `,
      fragment: `
        precision highp float;

        uniform float uTime;
        uniform float uAmplitude;
        uniform float uSpeed;
        uniform float uBlend;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform vec2 uResolution;

        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);

          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));

          vec2 u = f * f * (3.0 - 2.0 * f);

          return mix(a, b, u.x) +
                 (c - a) * u.y * (1.0 - u.x) +
                 (d - b) * u.x * u.y;
        }

        void main() {
          vec2 uv = gl_FragCoord.xy / uResolution.xy;
          vec2 p = uv;

          float t = uTime * uSpeed;

          float n1 = noise(vec2(p.x * 3.0, p.y * 2.0 + t * 0.35));
          float n2 = noise(vec2(p.x * 2.0 - t * 0.25, p.y * 3.0));
          float n3 = noise(vec2(p.x * 4.0 + t * 0.15, p.y * 4.0 - t * 0.2));

          float band1 = smoothstep(0.15, 0.95, sin((p.y + n1 * 0.45) * 6.0 + t) * 0.5 + 0.5);
          float band2 = smoothstep(0.2, 0.9, sin((p.x + n2 * 0.35) * 5.0 - t * 0.8) * 0.5 + 0.5);

          vec3 color = mix(uColor1, uColor2, band1);
          color = mix(color, uColor3, band2 * uBlend);

          float glow = (n1 * 0.45 + n2 * 0.35 + n3 * 0.2) * uAmplitude;
          color += glow * 0.18;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: amplitude },
        uSpeed: { value: speed },
        uBlend: { value: blend },
        uColor1: { value: hexToRgb(colorStops[0]) },
        uColor2: { value: hexToRgb(colorStops[1]) },
        uColor3: { value: hexToRgb(colorStops[2]) },
        uResolution: { value: [1, 1] },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      renderer.setSize(width, height);
      program.uniforms.uResolution.value = [width, height];
    };

    resize();
    window.addEventListener("resize", resize);

    let frame = 0;

    const update = (time: number) => {
      program.uniforms.uTime.value = time * 0.001;
      renderer.render({ scene: mesh });
      frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      if (gl.canvas.parentNode === container) {
        container.removeChild(gl.canvas);
      }
    };
  }, [colorStops, amplitude, speed, blend]);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
}

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace("#", "");
  const bigint = parseInt(cleanHex, 16);

  return [
    ((bigint >> 16) & 255) / 255,
    ((bigint >> 8) & 255) / 255,
    (bigint & 255) / 255,
  ];
}