import PixelShader from "./PixelShader";
import VertexShader from "./VertexShader";

export class System {

  static CreateVideoTexture(video) {
    return new THREE.VideoTexture(video);
  }
}

export class Pass {
  constructor(gui, stats, canvas, texture) {
    console.info('Pass()', this);
    this.gui = gui;
    this.stats = stats;
    this.texture = texture;
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.01, 1000);
    this.camera.position.set(-1, 0, 0);
    this.camera.lookAt(new THREE.Vector3(0,0,0));
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas
    });
    this.vertexShader = VertexShader;
    this.pixelShader = PixelShader;
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.material = new THREE.ShaderMaterial({
      vertexShader: this.vertexShader,
      fragmentShader: this.pixelShader
    });
    this.setUniform('sourceTexture', 't', this.texture);
    this.setUniform("")
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
    this.guiFolder = gui.addFolder("Pass");
    this.guiFolder.open();
    this.parameters = {
      Brightness: 1
    }
    this.guiFolder.add(this.parameters, "Brightness", 0, 2, 0.01).onChange(v => this.updateParameters());
    this.updateParameters();
  }

  beginRender() {
    this.render();
  }

  render() {
    this.stats.begin();
    this.texture.update();
    this.renderer.render(this.scene, this.camera);
    this.stats.end();
    requestAnimationFrame(this.render.bind(this));
  }

  updateParameters() {
    this.setUniform("Brightness", "f", this.parameters.Brightness);
  }

  setUniform(name, type, value) {
    this.material.uniforms[name] = {
      type: type,
      value: value
    };
  }
}
