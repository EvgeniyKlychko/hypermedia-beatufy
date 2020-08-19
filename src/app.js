import './assets/index.css';
import * as tf from '@tensorflow/tfjs';
// import * as facemesh from './lib/facemesh';
import * as facemesh from './lib/facemesh-custom';
import Stats from 'stats.js';
import {TRIANGULATION} from './triangulation';

const stats = new Stats();
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');
// const canvas1 = document.querySelector('#test')
const canvas2 = document.querySelector('#test2')
// const canvas1Ctx = canvas1.getContext('2d')
const canvas2Ctx = canvas2.getContext('2d')

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

function modifyKeypoints(keypoints_orig, box){

  const x = box.topLeft.slice([0], [1])
  const y = box.topLeft.slice([1], [1])
  //console.log(x)
  //console.log(y)
  //console.log('orig keypoints', keypoints_orig)
  const keypoints_x = keypoints_orig.slice([0, 0], [-1, 1]).sub(x)
  const keypoints_y = keypoints_orig.slice([0, 1], [-1, 1]).sub(y)
  const keypoints_z = keypoints_orig.slice([0, 2], [-1, 1])
  //console.log('x', keypoints_x)
  //console.log('y', keypoints_y)
  //console.log('z', keypoints_z)
  const new_coords = tf.concat([keypoints_x, keypoints_y, keypoints_z], 1)
  //console.log('new keypoints',new_coords)

  return new_coords.arraySync()
}

async function renderPrediction() {
  stats.begin();
  tf.engine().startScope();
  const predictions = await model.getFace(state.video, true);

  ctx.drawImage(state.video, 0, 0);

  const img = tf.browser.fromPixels(state.video)

  if (predictions.length > 0) {
    //const faceSmall = predictions[0].face.squeeze()
    const faceNormal = predictions[0].face2.squeeze()
    console.log(predictions)

    predictions.forEach(prediction => {
      const keypoints = modifyKeypoints(prediction.scaledMesh,
                                                       prediction.boundingBox);
      for (let i = 0; i < keypoints.length; i++) {
        const x = keypoints[i][0];
        const y = keypoints[i][1];

        canvas2Ctx.beginPath();
        canvas2Ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
        canvas2Ctx.fill();
      }
    });
    await tf.browser.toPixels(faceNormal, canvas2)
    img.dispose()
    //faceSmall.dispose()
    faceNormal.dispose()
  }
  stats.end();
  requestAnimationFrame(renderPrediction);
  tf.engine().endScope();
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
