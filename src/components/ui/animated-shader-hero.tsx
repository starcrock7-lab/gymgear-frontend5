"use client";

import React, { useEffect, useRef } from "react";
import { motion, type Variants } from "framer-motion";

/* WebGL ember/plate shader background. Ported from the 21st.dev
   animated-shader-hero and re-themed for GymGear: brand-orange ember
   clouds over site navy, with drifting glowing rings that read as
   weight plates. Canvas sizes to its parent, so it works as a section
   background, not just full-screen. */

interface HeroProps {
  trustBadge?: {
    text: string;
    icons?: string[];
  };
  headline: {
    line1: string;
    line2: string;
  };
  subtitle: string;
  buttons?: {
    primary?: { text: string; onClick?: () => void };
    secondary?: { text: string; onClick?: () => void };
  };
  className?: string;
}

/* Brand: accent #e8542a, navy #0d1b35 — keep in sync with globals.css. */
const fragmentSrc = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
uniform vec2 move;
#define T time
#define R resolution
#define MN min(R.x,R.y)
float rnd(vec2 p){
  p=fract(p*vec2(12.9898,78.233));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y);
}
float noise(in vec2 p){
  vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
  float a=rnd(i),b=rnd(i+vec2(1,0)),c=rnd(i+vec2(0,1)),d=rnd(i+1.);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p){
  float t=.0,a=1.; mat2 m=mat2(1.,-.5,.2,1.2);
  for(int i=0;i<5;i++){t+=a*noise(p);p*=2.*m;a*=.5;}
  return t;
}
void main(void){
  vec2 uv=(gl_FragCoord.xy-.5*R)/MN;
  uv+=move*8e-5;
  vec3 navy=vec3(.051,.106,.208);
  vec3 ember=vec3(.91,.33,.165);
  vec3 glint=vec3(1.,.62,.36);
  vec3 col=navy*.6;
  // ember smoke drifting sideways
  float bg=fbm(vec2(uv.x*1.6+T*.05,uv.y*2.2-T*.02));
  col+=ember*bg*.07;
  // soft furnace glow, upper centre (matches hero copy position)
  col+=ember*.03/(length(uv-vec2(0.,.42))+.3);
  // weight plates: slow-drifting glowing rings with hub, kept at the
  // edges and dim so the copy owns the centre
  for(float i=1.;i<6.;i++){
    float t=T*.09+i*2.4;
    vec2 c=vec2(sin(t*.6+i*1.7)*1.1,cos(t*.4+i*i)*.55);
    float r=.035+.018*i;
    float d=length(uv-c);
    float g=.0004/max(abs(d-r),.004)        // outer rim
           +.00022/max(abs(d-r*.55),.004)   // inner ring
           +.00015/max(d,.02);              // hub
    float centerFade=smoothstep(.15,.75,length(c));
    col+=g*centerFade*mix(ember,glint,.35+.35*sin(i*2.1));
  }
  // vignette keeps copy readable
  col*=1.-.6*dot(uv*vec2(.8,1.2),uv*vec2(.8,1.2));
  O=vec4(col,1.);
}`;

const vertexSrc = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;

class ShaderRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private uResolution: WebGLUniformLocation | null = null;
  private uTime: WebGLUniformLocation | null = null;
  private uMove: WebGLUniformLocation | null = null;
  private mouseMove: [number, number] = [0, 0];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2");
  }

  get ok() {
    return this.gl !== null;
  }

  private compile(type: number, source: string): WebGLShader | null {
    const gl = this.gl!;
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  setup(): boolean {
    const gl = this.gl;
    if (!gl) return false;
    const vs = this.compile(gl.VERTEX_SHADER, vertexSrc);
    const fs = this.compile(gl.FRAGMENT_SHADER, fragmentSrc);
    if (!vs || !fs) return false;
    const program = gl.createProgram();
    if (!program) return false;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return false;
    }
    this.program = program;

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    this.uResolution = gl.getUniformLocation(program, "resolution");
    this.uTime = gl.getUniformLocation(program, "time");
    this.uMove = gl.getUniformLocation(program, "move");
    return true;
  }

  updateMove(deltas: [number, number]) {
    this.mouseMove = deltas;
  }

  resize() {
    const gl = this.gl;
    if (!gl) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(now = 0) {
    const gl = this.gl;
    if (!gl || !this.program) return;
    gl.clearColor(0.051, 0.106, 0.208, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.uniform2f(this.uResolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uTime, now * 1e-3);
    gl.uniform2f(this.uMove, ...this.mouseMove);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose() {
    const gl = this.gl;
    if (!gl) return;
    if (this.program) gl.deleteProgram(this.program);
    if (this.buffer) gl.deleteBuffer(this.buffer);
    this.program = null;
    this.buffer = null;
  }
}

/* Pointer drift: accumulates mouse movement for a subtle parallax. */
function attachPointer(
  el: HTMLElement,
  onMove: (deltas: [number, number]) => void,
) {
  let moves: [number, number] = [0, 0];
  const handler = (e: PointerEvent) => {
    moves = [moves[0] + e.movementX, moves[1] + e.movementY];
    onMove(moves);
  };
  el.addEventListener("pointermove", handler);
  return () => el.removeEventListener("pointermove", handler);
}

function useShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new ShaderRenderer(canvas);
    if (!renderer.ok || !renderer.setup()) return; // navy CSS fallback

    const dpr = Math.max(1, 0.5 * window.devicePixelRatio);
    const host = canvas.parentElement ?? canvas;

    const resize = () => {
      canvas.width = host.clientWidth * dpr;
      canvas.height = host.clientHeight * dpr;
      renderer.resize();
    };
    resize();

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let frame = 0;
    if (reduced) {
      renderer.render(0); // single static frame
    } else {
      const loop = (now: number) => {
        renderer.render(now);
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    }

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) renderer.render(0);
    });
    ro.observe(host);
    const detachPointer = attachPointer(host, (d) => renderer.updateMove(d));

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      detachPointer();
      renderer.dispose();
    };
  }, []);

  return canvasRef;
}

/* Canvas-only export — drop inside any `relative` section. */
export function ShaderBackground({ className = "" }: { className?: string }) {
  const canvasRef = useShaderBackground();
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full bg-navy ${className}`}
    />
  );
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

/* Full standalone hero matching the 21st.dev API, restyled to brand. */
const Hero: React.FC<HeroProps> = ({
  trustBadge,
  headline,
  subtitle,
  buttons,
  className = "",
}) => {
  return (
    <div
      className={`relative h-screen w-full overflow-hidden bg-navy ${className}`}
    >
      <ShaderBackground />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center text-white"
      >
        {trustBadge && (
          <motion.div
            variants={fadeUp}
            className="mb-8 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm text-white/80 backdrop-blur-md"
          >
            {trustBadge.icons?.map((icon, i) => (
              <span key={i} className="text-accent">
                {icon}
              </span>
            ))}
            <span>{trustBadge.text}</span>
          </motion.div>
        )}
        <motion.h1
          variants={fadeUp}
          className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl"
        >
          <span className="bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-transparent">
            {headline.line1}
          </span>
          <br />
          <span className="bg-gradient-to-r from-accent via-[#ff7a4d] to-accent-deep bg-clip-text text-transparent">
            {headline.line2}
          </span>
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70 md:text-xl"
        >
          {subtitle}
        </motion.p>
        {buttons && (
          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-col justify-center gap-4 sm:flex-row"
          >
            {buttons.primary && (
              <button
                onClick={buttons.primary.onClick}
                className="rounded-xl bg-accent px-8 py-4 font-display text-lg font-bold text-white shadow-lg shadow-accent/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/50"
              >
                {buttons.primary.text}
              </button>
            )}
            {buttons.secondary && (
              <button
                onClick={buttons.secondary.onClick}
                className="rounded-xl border border-white/20 bg-white/5 px-8 py-4 font-display text-lg font-bold text-white/90 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10"
              >
                {buttons.secondary.text}
              </button>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Hero;
