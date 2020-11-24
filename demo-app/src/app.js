import './assets/index.css';
import * as dat from 'dat.gui';
import { RenderPass } from '../../lib/dist';
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
    document.querySelector('#output'),
    videoManager.video);
  presetManager.setRenderPass(pass1);

  _render();
  function _render() {
    pass1.render();
    requestAnimationFrame(_render);
  }
}
// -------------------------------------------------------------------------------------
window.addEventListener('load', init);
