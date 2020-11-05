import './assets/index.css';
import * as tf from '@tensorflow/tfjs';
import Stats from 'stats.js';
import * as facemesh from './lib/facemesh-custom';
import { bilateral_filter_mix, bilateral_filtering } from './utils';
import * as dat from 'dat.gui';
import { CROP_SIZE, VIDEO_RESOLUTION } from './constants/crop-size';
import { Pass, System } from './System';

// -------------------------------------------------------------------------------------
const gui = new dat.GUI({ width: 300 });
// -------------------------------------------------------------------------------------
const stats = new Stats();
function setupFPS() {
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom);
}
// -------------------------------------------------------------------------------------
const canvasOutput = document.querySelector('#output');
const state = {
  video: null,
};

async function loadVideo() {
  try {
    state.video = await setupCamera();
  } catch (e) {
    throw e;
  }
  state.video.play();
  async function setupCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Browser API navigator.mediaDevices.getUserMedia not available');
    }
    const videoElement = document.getElementById('video');
    videoElement.srcObject = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: VIDEO_RESOLUTION,
    });
    return new Promise((resolve) => {
      videoElement.onloadedmetadata = () => {
        videoElement.width = videoElement.videoWidth;
        videoElement.height = videoElement.videoHeight;
        resolve(videoElement);
      };
    });
  }
}

async function init() {
  setupFPS();
  await loadVideo();
  canvasOutput.width = state.video.width;
  canvasOutput.height = state.video.height;
  // await loadFaceMesh();
  // await renderPrediction();
  const pass1 = new Pass(
    gui, stats,
    canvasOutput,
    System.CreateVideoTexture(state.video)
  );
  pass1.beginRender();
}

init();
