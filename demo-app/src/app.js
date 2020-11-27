import './assets/index.css';
import * as dat from 'dat.gui';
import { RenderPass, Preset } from './Lib';
import { VideoManager } from './VideoManager';
import { StatsManager } from './StatsManager';
import { PresetManager } from './PresetManager';

// -------------------------------------------------------------------------------------
const videoId = 'video';
const canvasId = 'output';
const videoElement = document.getElementById(videoId);
const canvasElement = document.getElementById(canvasId);
// -------------------------------------------------------------------------------------
const settings = {
  InputVideoVisible: true
};
const gui = new dat.GUI({ width: 300 });
gui.add(settings, 'InputVideoVisible').onChange(v => _updateVideoVisibility());
const statsManager = new StatsManager();
const videoManager = new VideoManager();
const presetManager = new PresetManager(gui);
// -------------------------------------------------------------------------------------
async function init() {
  await videoManager.load(videoElement);
  _updateVideoVisibility();
  const pass1 = new RenderPass(canvasElement, videoElement);
  const preset1 = new Preset(`Blur(Radius 5px)`);
  preset1.defines.MSIZE = 5;
  const preset2 = new Preset(`Blur(Radius 15px)`);
  preset2.defines.MSIZE = 15;
  const preset3 = new Preset(`Blur(Radius 25px)`);
  preset3.defines.MSIZE = 25;
  presetManager.setRenderPass(pass1);
  presetManager.addPreset(preset1);
  presetManager.addPreset(preset2);
  presetManager.addPreset(preset3);
  presetManager.applyPreset(preset2);
  _render();
  function _render() {
    pass1.render();
    statsManager.stats.update();
    requestAnimationFrame(_render);
  }
}
function _updateVideoVisibility() { videoElement.style.display = settings.InputVideoVisible ? 'block' : 'none'; }
// -------------------------------------------------------------------------------------
window.addEventListener('load', init);
