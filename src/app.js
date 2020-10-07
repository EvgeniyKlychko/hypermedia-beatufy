import './assets/index.css';
import * as tf from '@tensorflow/tfjs';
import Stats from 'stats.js';
import * as facemesh from './lib/facemesh-custom';
import {
  bilateral_filter_gauss,
  gaussian_blurring,
  median_blurring,
  bilateral_filtering
} from './utils';
import * as dat from 'dat.gui';


// GUI Settings ----------------------------------------------------------------------->
const gui = new dat.GUI({width: 410});
const folderGaussianBlurring = gui.addFolder('Gaussian Blurring');
const folderMedianBlurring = gui.addFolder('Median Blurring');
const folderBilateralFiltering = gui.addFolder('Bilateral Filtering');
const folderMixBG = gui.addFolder('Bilateral Filtering with Gaussian Blurring');

let openFolderName = 'folderGaussianBlurring';
folderGaussianBlurring.open()

folderGaussianBlurring.domElement.addEventListener('click', () => {
  openFolderName = 'folderGaussianBlurring'
  folderMedianBlurring.close()
  folderBilateralFiltering.close()
  folderMixBG.close()
})
folderMedianBlurring.domElement.addEventListener('click', () => {
  openFolderName = 'folderMedianBlurring'
  folderGaussianBlurring.close()
  folderBilateralFiltering.close()
  folderMixBG.close()
})
folderBilateralFiltering.domElement.addEventListener('click', () => {
  openFolderName = 'folderBilateralFiltering'
  folderGaussianBlurring.close()
  folderMedianBlurring.close()
  folderMixBG.close()
})
folderMixBG.domElement.addEventListener('click', () => {
  openFolderName = 'folderMixBG'
  folderGaussianBlurring.close()
  folderMedianBlurring.close()
  folderBilateralFiltering.close()
})

const settingsParams = {
  gaussianKernelSize: 1,
  medianKernelSize: 1,
  bilateralDiameter: 1,
  bilateralSigma: 1,
  mixBGDiameter: 1,
  mixBGSigma: 1,
  mixBGKernelSize: 1,
}
folderGaussianBlurring.add(settingsParams, 'gaussianKernelSize', 0, 21, 2).name('kernel size').listen().onChange((value) => {
  if (value % 2 === 0) settingsParams.gaussianKernelSize = value + 1;
});

folderMedianBlurring.add(settingsParams, 'medianKernelSize', 0, 15, 2).name('kernel size').listen().onChange((value) => {
  if (value % 2 === 0) settingsParams.medianKernelSize = value + 1;
});

folderBilateralFiltering.add(settingsParams, 'bilateralDiameter', 1, 15, 1).name('diameter');
folderBilateralFiltering.add(settingsParams, 'bilateralSigma', 1, 255, 1).name('sigma');

folderMixBG.add(settingsParams, 'mixBGDiameter', 1, 15, 1).name('diameter');
folderMixBG.add(settingsParams, 'mixBGSigma', 1, 255, 1).name('sigma');
folderMixBG.add(settingsParams, 'mixBGKernelSize', 0, 15, 2).name('kernel size').listen().onChange((value) => {
  if (value % 2 === 0) settingsParams.mixBGKernelSize = value + 1;
});


// ------------------------------------------------------------------------------------>

function setFilter() {
  switch (openFolderName) {
    case 'folderGaussianBlurring':
      gaussian_blurring(settingsParams.gaussianKernelSize);
      break;
    case 'folderMedianBlurring':
      median_blurring(settingsParams.medianKernelSize);
      break;
    case 'folderBilateralFiltering':
      bilateral_filtering(settingsParams.bilateralDiameter, settingsParams.bilateralSigma);
      break;
    case 'folderMixBG':
      bilateral_filter_gauss(settingsParams.mixBGDiameter, settingsParams.mixBGSigma, settingsParams.mixBGKernelSize)
      break;
  }
}


// ------------------------------------------------------------------------------------>

let toggle = false;
window.tf = tf

let skipFrame = true

const stats = new Stats();

const canvasFinal = document.querySelector('#output');
const ctxFinal = canvasFinal.getContext('2d');
const canvasHelp = document.querySelector('#help');
const ctxHelp = canvasHelp.getContext('2d');

const outputWrapper = document.querySelector('.output');

outputWrapper.style.display = 'none'

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
  model = await facemesh.load({maxFaces: 1});
}

async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const videoElement = document.getElementById('video');

  videoElement.srcObject = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
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

      for (const prediction of predictions) {
        const arr = await tf.browser.toPixels(faceNormal)
        const idata = new ImageData(arr, cropSize[0], cropSize[1]);

        canvasHelp.width = cropSize[0]
        canvasHelp.height = cropSize[1]
        ctxHelp.putImageData(idata, 0, 0)

        setFilter()

        ctxFinal.drawImage(canvasHelp, box.startPoint[0], box.startPoint[1], cropSizeReal[0], cropSizeReal[1]);

        const imageData = ctxFinal.getImageData(0, 0, canvasFinal.width, canvasFinal.height);
        const ctxFilter = canvasFilter.getContext('2d')
        ctxFilter.putImageData(imageData, 0, 0);
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

  await loadFaceMesh();

  setupFPS();

  await renderPrediction();

}

init();
