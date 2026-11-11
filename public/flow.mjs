const fragmentSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 resolution;
uniform float time;

float noise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
  float b = fract(sin(dot(cell + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
  float c = fract(sin(dot(cell + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
  float d = fract(sin(dot(cell + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float field(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = turn * p * 2.03 + 3.8;
    amplitude *= 0.5;
  }
  return value;
}
void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 p = (uv - 0.5) * vec2(resolution.x / resolution.y, 1.0) * 2.5;
  float t = time * 0.1;
  vec2 q = vec2(field(p + vec2(t, -t * 0.3)), field(p + vec2(4.7, 1.3) - t * 0.6));
  vec2 r = vec2(field(p + 3.8 * q + vec2(1.2, t * 0.7)),
                field(p + 3.8 * q + vec2(-t * 0.4, 5.2)));
  float f = field(p + 4.2 * r);
  float veins = smoothstep(-0.4, 0.7, sin(f * 27.0 + r.x * 6.0 - t));
  vec3 dark = vec3(0.035, 0.045, 0.065);
  vec3 teal = vec3(0.12, 0.45, 0.42);
  vec3 violet = vec3(0.39, 0.16, 0.39);
  vec3 amber = vec3(0.8, 0.46, 0.27);
  vec3 color = mix(teal, violet, smoothstep(0.25, 0.7, q.y));
  color = mix(color, amber, smoothstep(0.36, 0.76, r.x));
  color = mix(dark, color, veins * 0.85 + 0.15);
  color += vec3(0.34, 0.27, 0.16) * pow(veins, 8.0) * smoothstep(0.3, 0.7, q.x);
  float edge = 1.0 - 0.32 * length(uv - 0.5);
  gl_FragColor = vec4(color * edge, 1.0);
}
`;

function startFlow(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) return;

  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, 'attribute vec2 position; void main() { gl_Position = vec4(position, 0.0, 1.0); }'],
    [gl.FRAGMENT_SHADER, fragmentSource],
  ]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return;
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const resolution = gl.getUniformLocation(program, 'resolution');
  const time = gl.getUniformLocation(program, 'time');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  let lost = false;
  let frame;
  let previous = 0;
  let elapsed = 12;

  function draw(now) {
    frame = undefined;
    if (lost || document.hidden || !visible) return;
    if (now - previous >= 40 || reduced.matches) {
      if (!reduced.matches) elapsed += Math.min((now - previous) / 1000, 0.1);
      previous = now;
      gl.uniform1f(time, elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      canvas.dataset.rendered = '';
    }
    if (!reduced.matches) frame = requestAnimationFrame(draw);
  }

  function update() {
    cancelAnimationFrame(frame);
    previous = 0;
    frame = requestAnimationFrame(draw);
  }

  new ResizeObserver(() => {
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(1, 1000 / Math.max(bounds.width, bounds.height));
    canvas.width = Math.max(1, Math.round(bounds.width * scale));
    canvas.height = Math.max(1, Math.round(bounds.height * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resolution, canvas.width, canvas.height);
    update();
  }).observe(canvas);

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  }).observe(canvas);
  reduced.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  canvas.addEventListener('webglcontextlost', () => {
    lost = true;
    cancelAnimationFrame(frame);
    delete canvas.dataset.rendered;
  });
}
document.querySelectorAll('canvas.light-study').forEach(startFlow);
