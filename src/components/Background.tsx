import { useEffect, useRef } from 'react';
import type { Appearance } from '../core/types';
const vertex = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const fragment = `precision mediump float;uniform vec2 resolution;uniform vec2 mouse;uniform float time;uniform float strength;uniform float softness;uniform vec3 base;uniform vec3 a;uniform vec3 b;
void main(){vec2 uv=gl_FragCoord.xy/resolution;vec2 delta=uv-mouse;float d=length(delta*vec2(resolution.x/resolution.y,1.));uv+=delta*exp(-d*d*9.)*strength*.7;float t=time*.05;uv.x+=sin(uv.y*7.+t)*.045;uv.y+=cos(uv.x*6.-t)*.045;float blue=sin(uv.x*9.+uv.y*6.+sin(uv.y*8.+t))*0.5+0.5;float peach=sin(uv.x*12.-uv.y*8.+t+2.)*.5+.5;blue=smoothstep(.12+softness*.13, .92, blue);peach=smoothstep(.45,.98,peach);vec3 col=mix(base,a,blue*.67);col=mix(col,b,peach*.42);float center=exp(-pow((uv.x-.5)*2.,2.)*3.-pow((uv.y-.55)*2.,2.)*5.);col=mix(col,base,center*.75);gl_FragColor=vec4(col,1.);}`;
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
export function Background({ appearance: a, paused }: { appearance: Appearance; paused: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    if (a.background === 'solid') return;
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      powerPreference: 'low-power',
    });
    if (!gl) return;
    let frame = 0,
      lost = false,
      stopped = false,
      time = 0,
      previous = 0;
    const mouse = [0.5, 0.5],
      target = [0.5, 0.5];
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const compile = (type: number, source: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        gl.deleteShader(s);
        return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, vertex),
      fs = compile(gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) return;
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const p = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(p);
    gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
    const uniforms = Object.fromEntries(
      ['resolution', 'mouse', 'time', 'strength', 'softness', 'base', 'a', 'b'].map((k) => [
        k,
        gl.getUniformLocation(program, k),
      ]),
    );
    const palette = a[a.theme];
    gl.uniform3fv(uniforms.base, rgb(palette.background));
    gl.uniform3fv(uniforms.a, rgb(palette.colorA));
    gl.uniform3fv(uniforms.b, rgb(palette.colorB));
    gl.uniform1f(uniforms.softness, a.softness);
    const render = (now: number) => {
      if (lost || stopped) return;
      const animated = a.motion && !paused && !media.matches && !document.hidden;
      if (animated) {
        time += Math.min(50, now - previous) * 0.001 * a.intensity;
        mouse[0] += (target[0] - mouse[0]) * 0.045;
        mouse[1] += (target[1] - mouse[1]) * 0.045;
      }
      previous = now;
      const ratio = Math.min(devicePixelRatio, 1.5);
      const w = Math.round(innerWidth * ratio),
        h = Math.round(innerHeight * ratio);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uniforms.resolution, w, h);
      gl.uniform2fv(uniforms.mouse, mouse);
      gl.uniform1f(uniforms.time, time);
      gl.uniform1f(uniforms.strength, animated ? a.distortion : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      canvas.style.opacity = '1';
      if (animated) frame = requestAnimationFrame(render);
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      render(performance.now());
    };
    const move = (e: PointerEvent) => {
      target[0] = e.clientX / innerWidth;
      target[1] = 1 - e.clientY / innerHeight;
    };
    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      canvas.style.opacity = '0';
      cancelAnimationFrame(frame);
    };
    canvas.addEventListener('webglcontextlost', onLost);
    window.addEventListener('pointermove', move);
    window.addEventListener('resize', restart);
    document.addEventListener('visibilitychange', restart);
    media.addEventListener('change', restart);
    restart();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      canvas.removeEventListener('webglcontextlost', onLost);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('resize', restart);
      document.removeEventListener('visibilitychange', restart);
      media.removeEventListener('change', restart);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [a, paused]);
  const p = a[a.theme];
  return (
    <div
      className="background"
      style={{
        background:
          a.background === 'solid'
            ? p.background
            : `radial-gradient(ellipse at 20% 10%,${p.colorA},transparent 55%),radial-gradient(ellipse at 95% 70%,${p.colorB},transparent 55%),${p.background}`,
      }}
    >
      <canvas
        ref={ref}
        aria-hidden="true"
        style={{ opacity: 0, display: a.background === 'solid' ? 'none' : 'block' }}
      />
    </div>
  );
}
