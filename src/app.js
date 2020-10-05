import './assets/index.css';
import * as tf from '@tensorflow/tfjs';
import Stats from 'stats.js';
import * as facemesh from './lib/facemesh-custom';
import {bilateral_filter, lowPassHighPass} from './utils';
import * as imageFilters from './imagefilters';

// Sliders --------------------------------------------------------------------------->
let sigmaSpace = 1;
const sigmaSpaceEl = document.querySelector('#blur-sigma')
const sigmaSpaceText = document.querySelector('#blur-sigma-text')
sigmaSpaceText.innerHTML = sigmaSpace
sigmaSpaceEl.defaultValue = 0

sigmaSpaceEl.addEventListener('input', (e) => {
  sigmaSpace = +e.target.value + 1
  sigmaSpaceText.innerHTML = sigmaSpace.toString()
})

let toggle = false;
window.tf = tf

let skipFrame = true

const jsFilter = {
  brightness: 20,
  saturation: -20
}

const stats = new Stats();

const canvasFinal = document.querySelector('#output');
const ctxFinal = canvasFinal.getContext('2d');
const canvasHelp = document.querySelector('#help');
const ctxHelp = canvasHelp.getContext('2d');

const outputWrapper = document.querySelector('.output');

outputWrapper.style.display = 'none'

let canvasFilter = document.querySelector('#filtered');

const blur_sigma = 1.2
const truncation_thresh_kernel = 4.0

const high_pass_threshold = 0.45

let model;
function setupFPS() {
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom);
}

const state = {
  video: null,
};

async function loadFacemesh() {
  model = await facemesh.load({maxFaces: 1});
}

async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const videoElement = document.getElementById('video');

  videoElement.srcObject = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video:  {
      width: 640,
      height: 480
    }
  });

  return new Promise((resolve) => {
    videoElement.onloadedmetadata = () => {
      videoElement.width = videoElement.videoWidth;
      videoElement.height = videoElement.videoHeight;
      resolve(videoElement);
    };
  });
}

async function loadVideo() {
  try {
    state.video = await setupCamera();
  } catch (e) {
    throw e;
  }

  state.video.play();
}

async function renderPrediction() {
  toggle = !toggle;
  stats.begin();

  if (skipFrame) {
    if (toggle) {
     await doRender()
    }
  } else {
    await doRender()
  }


  async function doRender() {
    tf.engine().startScope();
    ctxFinal.drawImage(state.video, 0, 0);
    const predictions = await model.getFace(state.video, true);

    if (predictions.length > 0) {
      const box = predictions[0].boxCPU
      const {faceSize} = predictions[0]

      const cropSizeReal = [parseInt(faceSize[0]), parseInt(faceSize[1])];
      const cropSize = [300, 300];

      let faceNormal = predictions[0].faceNormal.squeeze()
      let faceSmall = predictions[0].face.squeeze()

      for (const prediction of predictions){
        faceNormal = lowPassHighPass(faceNormal, high_pass_threshold, blur_sigma, truncation_thresh_kernel)
        const arr = await tf.browser.toPixels(faceNormal)
        const idata = new ImageData(arr, cropSize[0], cropSize[1]);

        canvasHelp.width = cropSize[0]
        canvasHelp.height = cropSize[1]
        ctxHelp.putImageData(idata, 0, 0)

        bilateral_filter(sigmaSpace)

        ctxFinal.drawImage(canvasHelp, box.startPoint[0], box.startPoint[1], cropSizeReal[0], cropSizeReal[1]);

        const imageData = ctxFinal.getImageData(0, 0, canvasFinal.width, canvasFinal.height);
        const filtered = ImageFilters.BrightnessContrastPhotoshop(imageData, jsFilter.brightness, jsFilter.saturation);
        const ctxFilter = canvasFilter.getContext('2d')
        ctxFilter.putImageData(filtered, 0, 0);
      }

      faceSmall.dispose()
      faceNormal.dispose()

    }

    tf.engine().endScope();
  }

  stats.end();
  requestAnimationFrame(renderPrediction);
}


async function init() {
  await tf.setBackend('webgl');
  await loadVideo();
  canvasFinal.width = state.video.width;
  canvasFinal.height = state.video.height;

  canvasFilter.width = state.video.width;
  canvasFilter.height = state.video.height;

  await loadFacemesh();

  setupFPS();

  await renderPrediction();

}
init();
