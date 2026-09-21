import {vec3, vec4} from 'gl-matrix';
import Stats from 'stats-js';
import * as DAT from 'dat.gui';
import Icosphere from './geometry/Icosphere';
import Square from './geometry/Square';
import OpenGLRenderer, {RenderParams} from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';

import fireballVertSource from './shaders/fireball-vert.glsl?raw';
import fireballFragSource from './shaders/fireball-frag.glsl?raw';
import backgroundVertSource from './shaders/background-vert.glsl?raw';
import backgroundFragSource from './shaders/background-frag.glsl?raw';
import toolboxSource from './shaders/toolbox.glsl?raw';
import noiseSource from './shaders/noise.glsl?raw';

// Vite gives us each .glsl file as a plain string, so there is no #include.
// The shaders mark where the shared helpers go and we paste them in here.
function resolveIncludes(src: string): string {
  return src
    .replace('//#include "toolbox.glsl"', toolboxSource)
    .replace('//#include "noise.glsl"', noiseSource);
}

// Defaults the Reset Fireball button copies back over the live controls.
const defaults = {
  tesselations: 6,
  displacement: 0.34,
  noiseScale: 3.0,
  noiseAmp: 0.22,
  octaves: 5,
  explosion: 0.55,
  animationSpeed: 1.0,
  hotColor: [255, 126, 30],
  coolColor: [96, 18, 10],
  background: true,
};

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  ...structuredClone(defaults),
  'Reset Fireball': resetFireball, // A function pointer, essentially
  'Load Scene': loadScene,
};

let icosphere: Icosphere;
let square: Square;
let gui: DAT.GUI;
let prevTesselations: number = defaults.tesselations;
let time: number = 0;
let prevFrameMs: number = 0;

function loadScene() {
  icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, controls.tesselations);
  icosphere.create();
  square = new Square(vec3.fromValues(0, 0, 0));
  square.create();
}

function resetFireball() {
  // structuredClone so the pickers don't end up mutating `defaults` itself
  Object.assign(controls, structuredClone(defaults));
  gui.updateDisplay();
}

// addColor gives back 0-255 triples, shaders want 0-1.
function guiColor(rgb: number[]): vec4 {
  return vec4.fromValues(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, 1);
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  gui = new DAT.GUI();
  gui.add(controls, 'tesselations', 0, 7).step(1);
  gui.add(controls, 'displacement', 0, 0.8).step(0.01);
  gui.add(controls, 'noiseScale', 0.5, 6).step(0.1);
  gui.add(controls, 'noiseAmp', 0, 0.5).step(0.01);
  gui.add(controls, 'octaves', 1, 7).step(1);
  gui.add(controls, 'explosion', 0, 1.5).step(0.05);
  gui.add(controls, 'animationSpeed', 0, 3).step(0.05);
  gui.addColor(controls, 'hotColor');
  gui.addColor(controls, 'coolColor');
  gui.add(controls, 'background');
  gui.add(controls, 'Reset Fireball');
  gui.add(controls, 'Load Scene');

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, 0, 5), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.015, 0.016, 0.035, 1);
  gl.enable(gl.DEPTH_TEST);

  const fireball = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, resolveIncludes(fireballVertSource)),
    new Shader(gl.FRAGMENT_SHADER, resolveIncludes(fireballFragSource)),
  ]);

  const background = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, resolveIncludes(backgroundVertSource)),
    new Shader(gl.FRAGMENT_SHADER, resolveIncludes(backgroundFragSource)),
  ]);

  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    if(controls.tesselations != prevTesselations)
    {
      prevTesselations = controls.tesselations;
      icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, prevTesselations);
      icosphere.create();
    }

    // Advance on wall clock instead of per frame so the explosion keeps its
    // period when the framerate drops. dt is capped so a backgrounded tab
    // doesn't come back to one huge jump.
    const nowMs = performance.now();
    const dt = prevFrameMs === 0 ? 0 : Math.min(0.1, (nowMs - prevFrameMs) / 1000);
    prevFrameMs = nowMs;
    time += 1.2 * dt * controls.animationSpeed;

    const params: RenderParams = {
      hotColor: guiColor(controls.hotColor),
      coolColor: guiColor(controls.coolColor),
      time: time,
      displace: controls.displacement,
      noiseScale: controls.noiseScale,
      noiseAmp: controls.noiseAmp,
      octaves: controls.octaves,
      explode: controls.explosion,
    };

    // The background quad is in NDC, so it goes first with depth off.
    if (controls.background) {
      gl.disable(gl.DEPTH_TEST);
      renderer.render(camera, background, [square], params);
      gl.enable(gl.DEPTH_TEST);
    }

    renderer.render(camera, fireball, [icosphere], params);

    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
