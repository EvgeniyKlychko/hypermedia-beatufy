export class Preset {

  defines = {
    MSIZE: 15,
    SKIN_DETECTION: true
  };
  uniforms = {
    Brightness: 1,
    SIGMA: 15,
    BSIGMA: 0.1
  };

  constructor(
    public name = `preset`) {}
}
