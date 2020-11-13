export class PresetManager {

  constructor(gui) {
    this.guiFolder = gui.addFolder('Presets');
    this.guiFolder.open();

    this.presetList = [
      new Preset(this.guiFolder, `Blur 0.1`, (preset) => this.applyPreset(preset), {
        MSIZE: 15,
        SKIN_DETECTION: true,
        Brightness: 1,
        SIGMA: 15,
        BSIGMA: 0.1
      }),
      new Preset(this.guiFolder, `Blur 1`, (preset) => this.applyPreset(preset), {
        MSIZE: 15,
        SKIN_DETECTION: true,
        Brightness: 1,
        SIGMA: 15,
        BSIGMA: 1
      }),
      new Preset(this.guiFolder, `Blur 10`, (preset) => this.applyPreset(preset), {
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

export class Preset {
  constructor(
    guiFolder,
    name = `unnamed`,
    onChange = (preset) => {},
    initializer = {
      MSIZE: 15,
      SKIN_DETECTION: true,
      Brightness: 1,
      SIGMA: 15,
      BSIGMA: 0.1
    }) {
      this.name = name;
      this.onChange = onChange;

      this.defines = {
        MSIZE: initializer.MSIZE,
        SKIN_DETECTION: initializer.SKIN_DETECTION
      };
      this.parameters = {
        Brightness: initializer.Brightness,
        SIGMA: initializer.SIGMA,
        BSIGMA: initializer.BSIGMA
      };

      if (guiFolder) {
        this.guiFolder = guiFolder.addFolder(`${name}`);
        this.guiFolder.open();
        this.guiFolder.add(this.defines, "MSIZE", 3, 31, 1).name(`Radius`);
        // this.guiFolder.add(this.defines, "SKIN_DETECTION");
        // this.guiFolder.add(this.parameters, "Brightness", 0, 2, 0.01);
        // this.guiFolder.add(this.parameters, "SIGMA", 10, 50);
        this.guiFolder.add(this.parameters, "BSIGMA", 0, 1).name(`Strength`);
        this.guiFolder.add(this, "handleChange").name("Apply");
      }
    }

    handleChange() {
      this.onChange(this);
    }
}
