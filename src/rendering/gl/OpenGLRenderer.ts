import {mat4, vec4} from 'gl-matrix';
import Drawable from './Drawable';
import Camera from '../../Camera';
import {gl} from '../../globals';
import ShaderProgram from './ShaderProgram';

// Everything the shaders need out of the GUI each frame, bundled so render()
// doesn't grow another argument every time I add a slider.
export interface RenderParams {
  hotColor: vec4;
  coolColor: vec4;
  time: number;
  displace: number;
  noiseScale: number;
  noiseAmp: number;
  octaves: number;
  explode: number;
}

// In this file, `gl` is accessible because it is imported above
class OpenGLRenderer {
  constructor(public canvas: HTMLCanvasElement) {
  }

  setClearColor(r: number, g: number, b: number, a: number) {
    gl.clearColor(r, g, b, a);
  }

  setSize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  render(camera: Camera, prog: ShaderProgram, drawables: Array<Drawable>,
         params: RenderParams) {
    let model = mat4.create();
    let viewProj = mat4.create();

    mat4.identity(model);
    mat4.multiply(viewProj, camera.projectionMatrix, camera.viewMatrix);

    // camera.position is never written by the orbit controls, so read the eye
    // off the controls directly.
    const eye = camera.controls.eye;

    prog.setModelMatrix(model);
    prog.setViewProjMatrix(viewProj);
    prog.setCameraPos(vec4.fromValues(eye[0], eye[1], eye[2], 1));
    prog.setGeometryColor(params.hotColor);
    prog.setCoolColor(params.coolColor);
    prog.setDimensions(this.canvas.width, this.canvas.height);
    prog.setTime(params.time);
    prog.setNoise(params.noiseScale, params.noiseAmp, params.octaves);
    prog.setShape(params.displace, params.explode);

    for (let drawable of drawables) {
      prog.draw(drawable);
    }
  }
};

export default OpenGLRenderer;
