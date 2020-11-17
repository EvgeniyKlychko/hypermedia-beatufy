import PixelShader from "./PixelShader";
import VertexShader from "./VertexShader";
import { Preset } from "./PresetManager";

export class RenderPass {

  constructor(name, gui, stats, canvas, video) {
    console.info('Pass()', this);
    // ------------------------------------------------------------------------
    this.guiFolder = gui.addFolder(`Blurring System`);
    this.guiFolder.open();
    this.preset = new Preset();
    this.presetName = this.preset.name;
    this.guiFolder.add(this, 'presetName').listen().name(`Selected Preset`);
    this.date = new Date();
    // ------------------------------------------------------------------------
    this.gui = gui;
    this.stats = stats;
    this.canvas = canvas;
    this.video = video;
    this.canvas.width = video.width;
    this.canvas.height = video.height;
    this.texture = new THREE.VideoTexture(video);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.01, 1000);
    this.camera.position.set(-1, 0, 0);
    this.camera.lookAt(new THREE.Vector3(0,0,0));
    this.renderer = new THREE.WebGLRenderer({ canvas: canvas });
    this.vertexShader = VertexShader;
    this.pixelShader = PixelShader;
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.material = this._createShaderMaterial();
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  beginRender() {
    this.render();
  }

  render() {
    this.stats.begin();
    this.texture.update();
    this.material.uniforms['iTime'].value = this.date.getTime() / 1000;
    this.material.uniforms['iResolution'].value.set(this.canvas.width, this.canvas.height, 1);
    this.renderer.render(this.scene, this.camera);
    this.stats.end();
    requestAnimationFrame(this.render.bind(this));
  }

  setPreset(preset) {
    this.preset = preset;
    this.presetName = this.preset.name;
    this._updateMaterial();
  }

  _updateMaterial() {
    this.material = this._createShaderMaterial();
    this.mesh.material = this.material;
  }

  _createShaderMaterial() {
    return new THREE.ShaderMaterial({
      defines: {
        MSIZE: parseInt(this.preset.defines.MSIZE),
        SKIN_DETECTION: this.preset.defines.SKIN_DETECTION
      },
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3() },
        iChannel0: { type: 't', value: this.texture },
        Brightness: { value: this.preset.parameters.Brightness },
        SIGMA: { value: this.preset.parameters.SIGMA },
        BSIGMA: { value: this.preset.parameters.BSIGMA }
      },
      vertexShader: this.vertexShader,
      fragmentShader: this.pixelShader
    });
  }

  _updateParameters() {
    for (let k in this.parameters) {
      this.material.uniforms[k].value = this.preset.parameters[k];
    }
  }
}
