import '../assets/index.css';
import * as dat from 'dat.gui';
import { RenderPass } from './RenderPass';
import { VideoManager } from './VideoManager';
import { StatsManager } from './StatsManager';

// -------------------------------------------------------------------------------------
const gui = new dat.GUI({ width: 300 });
const statsManager = new StatsManager();
const videoManager = new VideoManager();
// -------------------------------------------------------------------------------------
async function init() {
  await videoManager.load('video');
  const pass1 = new RenderPass(
    '1', gui, statsManager.stats,
    document.querySelector('#output'),
    videoManager.video);
  pass1.beginRender();
}
// -------------------------------------------------------------------------------------
window.addEventListener('load', init);
