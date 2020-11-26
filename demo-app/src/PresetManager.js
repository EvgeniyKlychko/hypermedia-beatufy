import { Preset } from './Lib';

export class PresetManager {

  constructor(gui) {
    console.log('PresetManager', this);
    this.guiFolder = gui.addFolder('Presets');
    this.guiFolder.open();

    this.presetList = [
      new Preset(`Blur(Radius 15px)`)
    ];

    this.presetList.forEach(p => {
      const folder = this.guiFolder.addFolder(`Preset ${p.name}`);
      folder.open();
      folder.add(p.defines, 'MSIZE', 3, 31, 1).name(`Radius`);
    });
  }

  setRenderPass(pass) {
    this.renderPass = pass;
  }

  applyPreset(preset) {
    this.renderPass.setPreset(preset);
  }
}
