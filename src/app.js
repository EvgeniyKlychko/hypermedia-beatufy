import './assets/index.css';
import * as tf from '@tensorflow/tfjs';
import Stats from 'stats.js';
import * as facemesh from './lib/facemesh-custom';
import { bilateral_filter_mix, bilateral_filtering } from './utils';
import * as dat from 'dat.gui';
import {CROP_SIZE, VIDEO_SIZE} from './constants/crop-size';

// GUI Settings ----------------------------------------------------------------------->
const gui = new dat.GUI({ width: 300 });
const folderBilateralFiltering = gui.addFolder('Bilateral Filter with presets');
const folderBilateralFilterMix = gui.addFolder(
  'Mixes (the original image with bilateral filter) with presets'
);
const folderManualBilateralFiltering = gui.addFolder('Bilateral Filtering with manual regulation');

let openFolderName = 'folderBilateralFiltering';
folderBilateralFiltering.open();

const presets = {
  'weak smoothing': 4,
  'medium smoothing': 10,
  'strong smoothing': 15,
};

const settingsParams = {
  bilateralSelectDiameter: presets[Object.keys(presets)[0]],
  mixSelectDiameter: presets[Object.keys(presets)[0]],
  manualDiameter: 1,
  manualSigma: 50,
};

folderBilateralFiltering.add(settingsParams, 'bilateralSelectDiameter', presets).name('presets');
folderBilateralFilterMix.add(settingsParams, 'mixSelectDiameter', presets).name('presets');

folderManualBilateralFiltering.add(settingsParams, 'manualDiameter', 1, 15, 1).name('diameter');
folderManualBilateralFiltering.add(settingsParams, 'manualSigma', 50, 255, 1).name('sigma');

folderBilateralFiltering.domElement.addEventListener('click', () => {
  openFolderName = 'folderBilateralFiltering';
  folderBilateralFilterMix.close();
  folderManualBilateralFiltering.close();
});
folderBilateralFilterMix.domElement.addEventListener('click', () => {
  openFolderName = 'folderBilateralFilterMix';
  folderBilateralFiltering.close();
  folderManualBilateralFiltering.close();
});
folderManualBilateralFiltering.domElement.addEventListener('click', () => {
  openFolderName = 'folderManualBilateralFiltering';
  folderBilateralFiltering.close();
  folderBilateralFilterMix.close();
});

// ------------------------------------------------------------------------------------>

function setFilter() {
  const sigma = 50;

  switch (openFolderName) {
    case 'folderBilateralFiltering':
      bilateral_filtering(+settingsParams.bilateralSelectDiameter, sigma);
      break;
    case 'folderBilateralFilterMix':
      bilateral_filter_mix(+settingsParams.mixSelectDiameter, sigma);
      break;
    case 'folderManualBilateralFiltering':
      bilateral_filtering(+settingsParams.manualDiameter, settingsParams.manualSigma);
      break;
  }
}

// ------------------------------------------------------------------------------------>

let toggle = false;
window.tf = tf;

let skipFrame = true;

const stats = new Stats();

const canvasOutput = document.querySelector('#output');
const ctxOutput = canvasOutput.getContext('2d');
const canvasHelp = document.querySelector('#help');
const ctxHelp = canvasHelp.getContext('2d');

let canvasFilter = document.querySelector('#filtered');

let model;

function setupFPS() {
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom);
}

const state = {
  video: null,
};

async function loadFaceMesh() {
  model = await facemesh.load({ maxFaces: 1 });
}

async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const videoElement = document.getElementById('video');

  videoElement.srcObject = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      width: VIDEO_SIZE,
      // height: VIDEO_SIZE,
    },
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
      await doRender();
    }
  } else {
    await doRender();
  }

  async function doRender() {
    tf.engine().startScope();
    ctxOutput.drawImage(state.video, 0, 0);
    const predictions = await model.getFace(state.video, true);

    if (predictions.length > 0) {
      const box = predictions[0].boxCPU;
      const { faceSize } = predictions[0];

      const cropSizeReal = [parseInt(faceSize[0]), parseInt(faceSize[1])];
      const cropSize = CROP_SIZE;

      let faceNormal = predictions[0].faceNormal.squeeze();
      let faceSmall = predictions[0].face.squeeze();

      for (const prediction of predictions) {
        const arr = await tf.browser.toPixels(faceNormal);
        const idata = new ImageData(arr, cropSize[0], cropSize[1]);

        canvasHelp.width = cropSize[0];
        canvasHelp.height = cropSize[1];
        ctxHelp.putImageData(idata, 0, 0);

        setFilter();

        ctxOutput.drawImage(
          canvasHelp,
          box.startPoint[0],
          box.startPoint[1],
          cropSizeReal[0],
          cropSizeReal[1]
        );

        const imageData = ctxOutput.getImageData(0, 0, canvasOutput.width, canvasOutput.height);
        const ctxFilter = canvasFilter.getContext('2d');
        ctxFilter.putImageData(imageData, 0, 0);
      }

      faceSmall.dispose();
      faceNormal.dispose();
    }

    tf.engine().endScope();
  }

  stats.end();
  requestAnimationFrame(renderPrediction);
}

async function init() {
  await tf.setBackend('webgl');
  await loadVideo();
  canvasOutput.width = state.video.width;
  canvasOutput.height = state.video.height;

  canvasFilter.width = state.video.width;
  canvasFilter.height = state.video.height;

  await loadFaceMesh();

  setupFPS();

  await renderPrediction();
}

init().then();
