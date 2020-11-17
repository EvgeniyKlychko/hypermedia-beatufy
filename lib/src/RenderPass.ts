import * as THREE from 'three';
import { VertexShader, PixelShader } from "./Shaders";
import { Preset } from "./Preset";

export class RenderPass {

  preset = new Preset();
  time = new Date();
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.01, 1000);
  geometry = new THREE.BoxGeometry(1, 1, 1);
  vertexShader = VertexShader;
  pixelShader = PixelShader;
  renderer: THREE.WebGLRenderer;
  texture: THREE.VideoTexture;
  material: THREE.ShaderMaterial;
  mesh: THREE.Mesh;

  constructor(
    public canvas: HTMLCanvasElement,
    public video: HTMLVideoElement) {
    this.canvas.width = video.width;
    this.canvas.height = video.height;
    this.texture = new THREE.VideoTexture(video);
    this.camera.position.set(-1, 0, 0);
    this.camera.lookAt(new THREE.Vector3(0,0,0));
    this.renderer = new THREE.WebGLRenderer({ canvas: canvas });
    this.mesh = new THREE.Mesh(this.geometry);
    this._updateMaterial();
    this.scene.add(this.mesh);
  }

  render() {
    this.texture.needsUpdate = true;
    this.material.uniforms['iTime'].value = this.time.getTime() / 1000;
    this.material.uniforms['iResolution'].value.set(this.canvas.width, this.canvas.height, 1);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.render.bind(this));
  }

  setPreset(preset: Preset) {
    this.preset = preset;
    this._updateMaterial();
  }

  private _updateMaterial() {
    this.material = new THREE.ShaderMaterial({
      defines: {
        MSIZE: Math.round(this.preset.defines.MSIZE),
        SKIN_DETECTION: this.preset.defines.SKIN_DETECTION
      },
      uniforms: {
        iTime: { value: this.time.getTime() / 1000 },
        iResolution: { value: new THREE.Vector3() },
        iChannel0: { value: this.texture },
        Brightness: { value: this.preset.uniforms.Brightness },
        SIGMA: { value: this.preset.uniforms.SIGMA },
        BSIGMA: { value: this.preset.uniforms.BSIGMA }
      },
      vertexShader: this.vertexShader,
      fragmentShader: this.pixelShader
    });
    this.mesh.material = this.material;
  }
}
