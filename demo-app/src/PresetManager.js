import { Preset } from '../../lib/dist';

export class PresetManager {

  constructor(gui) {
    this.guiFolder = gui.addFolder('Presets');
    this.guiFolder.open();

    this.presetList = [
      new Preset(this.guiFolder, `Blur(Scale 0.1, Radius 3px)`, (preset) => this.applyPreset(preset), {
        MSIZE: 3,
        SKIN_DETECTION: true,
        Brightness: 1,
        SIGMA: 15,
        BSIGMA: 0.1
      }),
      new Preset(this.guiFolder, `Blur(Scale 0.1, Radius 7px)`, (preset) => this.applyPreset(preset), {
        MSIZE: 7,
        SKIN_DETECTION: true,
        Brightness: 1,
        SIGMA: 15,
        BSIGMA: 0.1
      }),
      new Preset(this.guiFolder, `Blur(Scale 0.1, Radius 15px)`, (preset) => this.applyPreset(preset), {
        MSIZE: 15,
        SKIN_DETECTION: true,
        Brightness: 1,
        SIGMA: 15,
        BSIGMA: 0.1
      }),
      new Preset(this.guiFolder, `Blur(Scale 0.1, Radius 25px)`, (preset) => this.applyPreset(preset), {
        MSIZE: 25,
        SKIN_DETECTION: true,
        Brightness: 1,
        SIGMA: 15,
        BSIGMA: 0.1
      }),
      new Preset(this.guiFolder, `Blur(Scale 0.1, Radius 31px)`, (preset) => this.applyPreset(preset), {
        MSIZE: 31,
        SKIN_DETECTION: true,
        Brightness: 1,
        SIGMA: 15,
        BSIGMA: 0.1
      }),
      new Preset(this.guiFolder, `Blur(Scale 1, Radius 15px)`, (preset) => this.applyPreset(preset), {
        MSIZE: 15,
        SKIN_DETECTION: true,
        Brightness: 1,
        SIGMA: 15,
        BSIGMA: 1
      }),
      new Preset(this.guiFolder, `Blur(Scale 10, Radius 15px)`, (preset) => this.applyPreset(preset), {
        MSIZE: 15,
        SKIN_DETECTION: true,
        Brightness: 1,
        SIGMA: 15,
        BSIGMA: 10
      })
    ];
  }

  setRenderPass(pass) {
    this.renderPass = pass;
  }

  applyPreset(preset) {
    this.renderPass.setPreset(preset);
  }
}
