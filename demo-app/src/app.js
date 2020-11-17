import '../assets/index.css';
import * as dat from 'dat.gui';
import { RenderPass } from './RenderPass';
import { VideoManager } from './VideoManager';
import { StatsManager } from './StatsManager';
import { PresetManager } from './PresetManager';

// -------------------------------------------------------------------------------------
const gui = new dat.GUI({ width: 300 });
const statsManager = new StatsManager();
const videoManager = new VideoManager();
const presetManager = new PresetManager(gui);
// -------------------------------------------------------------------------------------
async function init() {
  await videoManager.load('video');
  const pass1 = new RenderPass(
    '1', gui, statsManager.stats,
    document.querySelector('#output'),
    videoManager.video);
  presetManager.setRenderPass(pass1);
  pass1.setPreset(presetManager.presetList[0]);
  pass1.beginRender();
}
// -------------------------------------------------------------------------------------
window.addEventListener('load', init);
