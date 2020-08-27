import './assets/index.css';
import * as tf from '@tensorflow/tfjs';
import Stats from 'stats.js';
import * as facemesh from './lib/facemesh-custom';
import { segmentFace, segmentFaceContour, increase_brightnessv3, convole_gaussian, alpha_blend_simple } from './utils';
import * as imageFilters from './imagefilters';
import * as webglImageFilter from './webgl-image-filter';

const useCanvas = false
const useContour = true
const useFilter = 'webgl' // 'css' 'webgl' 'js'

const cssFilter = 'brightness(140%) saturate(60%)';
const jsFilter = {
  brightness: 20,
  saturation: -20
}

const webglFilter = {
  brightness: 0.8,
  saturation: -0.2
}

const stats = new Stats();

const canvasFinal = document.querySelector('#output');
const ctxFinal = canvasFinal.getContext('2d');
const canvasSmall = document.querySelector('#small');
const ctxSmall = canvasSmall.getContext('2d');
const canvasHelp = document.querySelector('#help');
const ctxHelp = canvasHelp.getContext('2d');

const outputWrapper = document.querySelector('.output');
const filteredWrapper = document.querySelector('.filtered');

if (useFilter) {
  outputWrapper.style.display = 'none'
} else {
  filteredWrapper.style.display = 'none'
}

const canvasFilter = document.querySelector('#filtered');
const seg_threshold = tf.tensor1d([0.08])
const sampling_points = [9, 18, 50, 5, 376, 187, 83, 164, 229, 299, 233, 84, 2, 1, 53]
const box_filter_size = 5
const brightness_boost = 0.15
const gaussian_kernel_single_ch = tf.tensor4d([1.94254715e-07, 9.65682564e-06, 1.00626434e-04, 2.19788338e-04, 1.00626434e-04, 9.65682564e-06, 1.94254715e-07,
                                               9.65682564e-06, 4.80061867e-04, 5.00235953e-03, 1.09261577e-02, 5.00235953e-03, 4.80061867e-04, 9.65682564e-06,
                                               1.00626434e-04, 5.00235953e-03,  5.21257832e-02, 1.13853178e-01, 5.21257832e-02, 5.00235953e-03,1.00626434e-04,
                                               2.19788338e-04, 1.09261577e-02, 1.13853178e-01, 2.48678204e-01, 1.13853178e-01, 1.09261577e-02, 2.19788338e-04,
                                               1.00626434e-04, 5.00235953e-03, 5.21257832e-02, 1.13853178e-01, 5.21257832e-02, 5.00235953e-03, 1.00626434e-04,
                                               9.65682564e-06, 4.80061867e-04, 5.00235953e-03, 1.09261577e-02, 5.00235953e-03, 4.80061867e-04, 9.65682564e-06,
                                               1.94254715e-07, 9.65682564e-06, 1.00626434e-04, 2.19788338e-04, 1.00626434e-04, 9.65682564e-06, 1.94254715e-07],
  [7, 7, 1, 1])
const gaussian_kernel = tf.concat([gaussian_kernel_single_ch, gaussian_kernel_single_ch, gaussian_kernel_single_ch], 2)

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

function point(x, y, color, context){
  context.beginPath();
  context.arc(x, y, 10, 0, 2 * Math.PI, true);
  context.fillStyle = color;
  context.fill();
}

// ---------------------- image processing functions ---------------------------

function modifyKeypoints(keypoints_orig, box, faceSize){
  let [ width, height ] = faceSize
  const widthC = 192 / width
  const heightC = 192 / height
  const widthTensor = tf.tensor1d([widthC])
  const heightTensor = tf.tensor1d([heightC])

  const x = box.topLeft.slice([0], [1])
  const y = box.topLeft.slice([1], [1])

  const keypoints_x = keypoints_orig.slice([0, 0], [-1, 1]).sub(x).mul(widthTensor)
  const keypoints_y = keypoints_orig.slice([0, 1], [-1, 1]).sub(y).mul(heightTensor)
  const keypoints_z = keypoints_orig.slice([0, 2], [-1, 1])

  const new_coords = tf.concat([keypoints_x, keypoints_y, keypoints_z], 1)

  return new_coords.arraySync()
}


// ---------------------- END image processing functions -------------------------

async function renderPrediction() {
  stats.begin();
  tf.engine().startScope();
  const predictions = await model.getFace(state.video, true);

  if (predictions.length > 0) {
    const box = predictions[0].boxCPU
    const {faceSize} = predictions[0]

    const cropSizeReal = [parseInt(faceSize[0]), parseInt(faceSize[1])];
    const cropSize = [192, 192];

    let faceNormal = predictions[0].faceNormal.squeeze()
    let faceSmall = predictions[0].face.squeeze()

    for (const prediction of predictions){
      const keypoints = modifyKeypoints(prediction.scaledMesh,
          prediction.boundingBox,
          prediction.faceSize);

      let seg_skin;
      let mask;

      if (useContour) {
        [seg_skin, mask] = segmentFaceContour(faceNormal, faceSmall, keypoints, box_filter_size)
      } else {
        [seg_skin, mask] = segmentFace(faceNormal, faceSmall, keypoints,
            seg_threshold, sampling_points,
            box_filter_size)
      }

      if (!useFilter) {
        seg_skin = increase_brightnessv3(seg_skin, brightness_boost)
      }

      seg_skin = convole_gaussian(seg_skin, gaussian_kernel)
      faceNormal = alpha_blend_simple(faceNormal, seg_skin, mask)
      const arr = await tf.browser.toPixels(faceNormal)
      const idata = new ImageData(arr, cropSize[0], cropSize[1]);

      canvasHelp.width = cropSize[0]
      canvasHelp.height = cropSize[1]
      ctxHelp.putImageData(idata, 0, 0)

      ctxFinal.drawImage(state.video, 0, 0);

      ctxFinal.drawImage(canvasHelp, box.startPoint[0], box.startPoint[1], cropSizeReal[0], cropSizeReal[1]);
      console.log('---------------------', canvasFinal)
      if (useFilter) {
        if (useFilter === 'js') {
          const imageData = ctxFinal.getImageData(0, 0, canvasFinal.width, canvasFinal.height);
          const filtered = ImageFilters.BrightnessContrastPhotoshop(imageData, jsFilter.brightness, jsFilter.saturation);
          const ctxFilter = canvasFilter.getContext('2d')
          ctxFilter.putImageData(filtered, 0, 0);
        } else if (useFilter === 'webgl') {
          try {
            // in this case, filteredImage is an existing html canvas
            const filter = new WebGLImageFilter({ canvas: canvasFilter });
            filter.addFilter('brightness', webglFilter.brightness)
            filter.addFilter('saturation', webglFilter.saturation)
            filter.apply(canvasFinal);
          } catch( err ) {
            console.log('-----------error----------', err)
          }
        } else {
          const imageData = ctxFinal.getImageData(0, 0, canvasFinal.width, canvasFinal.height);
          const ctxFilter = canvasFilter.getContext('2d')
          ctxFilter.filter = cssFilter;
          ctxFilter.putImageData(imageData, 0, 0);
        }
      }

      for (let i = 0; i < keypoints.length; i++) {
        const x = keypoints[i][0];
        const y = keypoints[i][1];

        ctxHelp.beginPath();
        ctxHelp.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
        ctxHelp.fill();
      }
      mask.dispose()
      seg_skin.dispose()
    }

    faceSmall.dispose()
    faceNormal.dispose()

  }
  stats.end();
  requestAnimationFrame(renderPrediction);
  tf.engine().endScope();
}


async function renderPredictionFromCanvas() {
  stats.begin();
  tf.engine().startScope();
  const predictions = await model.getFace(state.video, true);

  // const img = tf.browser.fromPixels(state.video)
  // const image = img.toFloat().expandDims(0).div(255)

  if (predictions.length > 0) {
    const box = predictions[0].boxCPU
    const {faceSize} = predictions[0]

    const cropSizeReal = [parseInt(faceSize[0]), parseInt(faceSize[1])];
    const cropSize = [192, 192];

    // ctx.drawImage(state.video, 0, 0);
    // point(box.startPoint[0], box.startPoint[1], 'red')
    // point(box.endPoint[0], box.startPoint[1], 'green')
    ctxSmall.clearRect(0, 0, canvasSmall.width, canvasSmall.height);
    canvasSmall.width = cropSize[0]
    canvasSmall.height = cropSize[1]
    ctxFinal.globalCompositeOperation = 'source-over';

    ctxSmall.drawImage(state.video, box.startPoint[0], box.startPoint[1], cropSize[0], cropSize[1], 0, 0, cropSize[0], cropSize[1]);

    let faceNormal = tf.browser.fromPixels(canvasSmall).div(255)
    let faceSmall = predictions[0].face.squeeze()

    for (const prediction of predictions){
      const keypoints = modifyKeypoints(prediction.scaledMesh,
          prediction.boundingBox,
          prediction.faceSize);
      let seg_skin;
      let mask;

      if (useContour) {
        [seg_skin, mask] = segmentFaceContour(faceNormal, faceSmall, keypoints, box_filter_size)
      } else {
        [seg_skin, mask] = segmentFace(faceNormal, faceSmall, keypoints,
            seg_threshold, sampling_points,
            box_filter_size)
      }

      if (!useFilter) {
        seg_skin = increase_brightnessv3(seg_skin, brightness_boost)
      }

      seg_skin = convole_gaussian(seg_skin, gaussian_kernel)
      faceNormal = alpha_blend_simple(faceNormal, seg_skin, mask)
      const arr = await tf.browser.toPixels(faceNormal)
      const idata = new ImageData(arr, cropSize[0], cropSize[1]);


      canvasHelp.width = cropSize[0]
      canvasHelp.height = cropSize[1]
      ctxHelp.putImageData(idata, 0, 0)


      ctxFinal.drawImage(state.video, 0, 0);
      ctxFinal.drawImage(canvasHelp, box.startPoint[0], box.startPoint[1], cropSizeReal[0], cropSizeReal[1]);

      if (useFilter) {
        if (useFilter === 'js') {
          const imageData = ctxFinal.getImageData(0, 0, canvasFinal.width, canvasFinal.height);
          const filtered = ImageFilters.BrightnessContrastPhotoshop(imageData, jsFilter.brightness, jsFilter.saturation);
          const ctxFilter = canvasFilter.getContext('2d')
          ctxFilter.putImageData(filtered, 0, 0);
        } else if (useFilter === 'webgl') {
          try {
            // in this case, filteredImage is an existing html canvas
            const filter = new WebGLImageFilter({ canvas: canvasFilter });
            filter.addFilter('brightness', webglFilter.brightness)
            filter.addFilter('saturation', webglFilter.saturation)
            filter.apply(canvasFinal);
          } catch( err ) {
            console.log('-----------error----------', err)
          }
        } else {
          const imageData = ctxFinal.getImageData(0, 0, canvasFinal.width, canvasFinal.height);
          const ctxFilter = canvasFilter.getContext('2d')
          ctxFilter.filter = cssFilter;
          ctxFilter.putImageData(imageData, 0, 0);
        }
      }

      mask.dispose()
      seg_skin.dispose()
    }

    faceSmall.dispose()
    faceNormal.dispose()

  }
  stats.end();
  requestAnimationFrame(renderPrediction);
  tf.engine().endScope();
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
  if (useCanvas) {
    await renderPredictionFromCanvas();
  } else {
    await renderPrediction();
  }

}
init();
