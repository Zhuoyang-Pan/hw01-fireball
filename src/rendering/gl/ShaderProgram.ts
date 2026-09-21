import {vec4, mat4} from 'gl-matrix';
import Drawable from './Drawable';
import {gl} from '../../globals';

var activeProgram: WebGLProgram = null;

export class Shader {
  shader: WebGLShader;

  constructor(type: number, source: string) {
    this.shader = gl.createShader(type);
    gl.shaderSource(this.shader, source);
    gl.compileShader(this.shader);

    if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
      throw gl.getShaderInfoLog(this.shader);
    }
  }
};

class ShaderProgram {
  prog: WebGLProgram;

  attrPos: number;
  attrNor: number;
  attrCol: number;

  unifModel: WebGLUniformLocation;
  unifModelInvTr: WebGLUniformLocation;
  unifViewProj: WebGLUniformLocation;
  unifColor: WebGLUniformLocation;
  unifCoolColor: WebGLUniformLocation;
  unifCamPos: WebGLUniformLocation;
  unifDimensions: WebGLUniformLocation;
  unifTime: WebGLUniformLocation;
  unifDisplace: WebGLUniformLocation;
  unifNoiseScale: WebGLUniformLocation;
  unifNoiseAmp: WebGLUniformLocation;
  unifOctaves: WebGLUniformLocation;
  unifExplode: WebGLUniformLocation;

  constructor(shaders: Array<Shader>) {
    this.prog = gl.createProgram();

    for (let shader of shaders) {
      gl.attachShader(this.prog, shader.shader);
    }
    gl.linkProgram(this.prog);
    if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
      throw gl.getProgramInfoLog(this.prog);
    }

    this.attrPos = gl.getAttribLocation(this.prog, "vs_Pos");
    this.attrNor = gl.getAttribLocation(this.prog, "vs_Nor");
    this.attrCol = gl.getAttribLocation(this.prog, "vs_Col");
    this.unifModel      = gl.getUniformLocation(this.prog, "u_Model");
    this.unifModelInvTr = gl.getUniformLocation(this.prog, "u_ModelInvTr");
    this.unifViewProj   = gl.getUniformLocation(this.prog, "u_ViewProj");
    this.unifColor      = gl.getUniformLocation(this.prog, "u_Color");
    this.unifCoolColor  = gl.getUniformLocation(this.prog, "u_CoolColor");
    this.unifCamPos     = gl.getUniformLocation(this.prog, "u_CamPos");
    this.unifDimensions = gl.getUniformLocation(this.prog, "u_Dimensions");
    this.unifTime       = gl.getUniformLocation(this.prog, "u_Time");
    this.unifDisplace   = gl.getUniformLocation(this.prog, "u_Displace");
    this.unifNoiseScale = gl.getUniformLocation(this.prog, "u_NoiseScale");
    this.unifNoiseAmp   = gl.getUniformLocation(this.prog, "u_NoiseAmp");
    this.unifOctaves    = gl.getUniformLocation(this.prog, "u_Octaves");
    this.unifExplode    = gl.getUniformLocation(this.prog, "u_Explode");
  }

  use() {
    if (activeProgram !== this.prog) {
      gl.useProgram(this.prog);
      activeProgram = this.prog;
    }
  }

  setModelMatrix(model: mat4) {
    this.use();
    if (this.unifModel !== -1) {
      gl.uniformMatrix4fv(this.unifModel, false, model);
    }

    if (this.unifModelInvTr !== -1) {
      let modelinvtr: mat4 = mat4.create();
      mat4.transpose(modelinvtr, model);
      mat4.invert(modelinvtr, modelinvtr);
      gl.uniformMatrix4fv(this.unifModelInvTr, false, modelinvtr);
    }
  }

  setViewProjMatrix(vp: mat4) {
    this.use();
    if (this.unifViewProj !== -1) {
      gl.uniformMatrix4fv(this.unifViewProj, false, vp);
    }
  }

  setGeometryColor(color: vec4) {
    this.use();
    if (this.unifColor !== -1) {
      gl.uniform4fv(this.unifColor, color);
    }
  }

  setCoolColor(color: vec4) {
    this.use();
    if (this.unifCoolColor !== -1) {
      gl.uniform4fv(this.unifCoolColor, color);
    }
  }

  setCameraPos(pos: vec4) {
    this.use();
    if (this.unifCamPos !== -1) {
      gl.uniform4fv(this.unifCamPos, pos);
    }
  }

  setDimensions(width: number, height: number) {
    this.use();
    if (this.unifDimensions !== -1) {
      gl.uniform2f(this.unifDimensions, width, height);
    }
  }

  setTime(time: number) {
    this.use();
    if (this.unifTime !== -1) {
      gl.uniform1f(this.unifTime, time);
    }
  }

  // frequency, amplitude and octave count of the fbm layer
  setNoise(scale: number, amp: number, octaves: number) {
    this.use();
    if (this.unifNoiseScale !== -1) {
      gl.uniform1f(this.unifNoiseScale, scale);
    }
    if (this.unifNoiseAmp !== -1) {
      gl.uniform1f(this.unifNoiseAmp, amp);
    }
    if (this.unifOctaves !== -1) {
      gl.uniform1i(this.unifOctaves, octaves);
    }
  }

  // amplitude of the low frequency sinusoids, and the explosion on top
  setShape(displace: number, explode: number) {
    this.use();
    if (this.unifDisplace !== -1) {
      gl.uniform1f(this.unifDisplace, displace);
    }
    if (this.unifExplode !== -1) {
      gl.uniform1f(this.unifExplode, explode);
    }
  }

  draw(d: Drawable) {
    this.use();

    if (this.attrPos != -1 && d.bindPos()) {
      gl.enableVertexAttribArray(this.attrPos);
      gl.vertexAttribPointer(this.attrPos, 4, gl.FLOAT, false, 0, 0);
    }

    if (this.attrNor != -1 && d.bindNor()) {
      gl.enableVertexAttribArray(this.attrNor);
      gl.vertexAttribPointer(this.attrNor, 4, gl.FLOAT, false, 0, 0);
    }

    d.bindIdx();
    gl.drawElements(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0);

    if (this.attrPos != -1) gl.disableVertexAttribArray(this.attrPos);
    if (this.attrNor != -1) gl.disableVertexAttribArray(this.attrNor);
  }
};

export default ShaderProgram;
