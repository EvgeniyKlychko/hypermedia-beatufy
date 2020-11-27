import { Preset } from './Lib';

export class PresetManager {

  constructor(gui) {
    console.info('PresetManager()', this);
    this.presetList = [];
    this.selectedPresetName = '';
    this.guiFolder = gui.addFolder('Presets');
    this.guiFolder.open();
    this.guiFolder.add(this, 'selectedPresetName').listen();
  }

  addPreset(preset) {
    this.presetList.push(new PresetController(preset, this.guiFolder, (p) => this.applyPreset(p)));
  }

  setRenderPass(pass) {
    this.renderPass = pass;
  }

  applyPreset(preset) {
    console.info('PresetManager.applyPreset()', preset);
    this.selectedPresetName = preset.name;
    this.renderPass.setPreset(preset);
  }
}

export class PresetController {

  constructor(preset, gui, applyCallback = (preset) => {}) {
    console.info(`PresetController()`, this);
    this.gui = gui;
    this.preset = preset;
    this.onApply = applyCallback;
    this.guiFolder = gui.addFolder(`Preset ${preset.name}`);
    this.guiFolder.open();
    this.guiFolder.add(preset.defines, 'MSIZE', 3, 31, 1).name(`Radius`);
    this.guiFolder.add(preset.uniforms, 'Brightness', 0, 2, 0.1).name(`Brightness`);
    this.guiFolder.add(this, 'apply');
  }

  apply() {
    this.onApply(this.preset);
  }
}
