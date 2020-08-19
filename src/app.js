import './assets/index.css';
import * as tf from '@tensorflow/tfjs';
// import * as facemesh from './lib/facemesh';
import * as facemesh from './lib/facemesh-custom';
import Stats from 'stats.js';
import {TRIANGULATION} from './triangulation';

const stats = new Stats();
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');
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

  videoElement.srcObject = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });

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

function drawPath(ctx, points, closePath) {
  const region = new Path2D();
  region.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    region.lineTo(point[0], point[1]);
  }

  if (closePath) {
    region.closePath();
  }
  ctx.stroke(region);
}

async function renderPrediction() {
  stats.begin();
  // const canvas1 = document.querySelector('#test')
  const canvas2 = document.querySelector('#test2')
  // const canvas1Ctx = canvas1.getContext('2d')
  const canvas2Ctx = canvas2.getContext('2d')
  const predictions = await model.getFace(state.video, true);
  ctx.drawImage(state.video, 0, 0);

  const img = tf.browser.fromPixels(state.video)
  const faceSmall = predictions[0].face.squeeze()
  const faceNormal = predictions[0].face2.squeeze()

  if (predictions.length > 0) {
    tf.engine().startScope();
    tf.browser.toPixels(faceNormal, canvas2)
    tf.engine().endScope();

    predictions.forEach(prediction => {
      const keypoints = prediction.scaledMesh;

      for (let i = 0; i < keypoints.length; i++) {
        const x = keypoints[i][0];
        const y = keypoints[i][1];

        ctx.beginPath();
        ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }

  stats.end();
  requestAnimationFrame(renderPrediction);
}


async function init() {
  await tf.setBackend('webgl');
  await loadVideo();
  canvas.width = state.video.width;
  canvas.height = state.video.height;


  await loadFacemesh();

  setupFPS();
  await renderPrediction();
}
init();
