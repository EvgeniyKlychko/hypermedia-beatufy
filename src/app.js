import './assets/index.css';
import * as tf from '@tensorflow/tfjs';
// import * as facemesh from './lib/facemesh';
import * as facemesh from './lib/facemesh-custom';
import Stats from 'stats.js';
import {TRIANGULATION} from './triangulation';

const stats = new Stats();
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');
//const canvas1 = document.querySelector('#test')
//const canvas2 = document.querySelector('#test2')
//const canvas1Ctx = canvas1.getContext('2d')
//const canvas2Ctx = canvas2.getContext('2d')
const sampling_points = [9, 18, 50, 5, 376, 187, 83, 164, 229, 299, 84, 2, 1]
const sample_size_px = 3
const seg_threshold = tf.tensor1d([0.075])
const box_filter_size = 5

window.tf = tf

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

// ---------------------- image processing functions ---------------------------

function modifyKeypoints(keypoints_orig, box, faceSize){

  let [ width, height ] = faceSize
  const widthC = 192 / width
  const heightC = 192 / height
  const widthTensor = tf.tensor1d([widthC])
  const heightTensor = tf.tensor1d([heightC])

  const x = box.topLeft.slice([0], [1])
  const y = box.topLeft.slice([1], [1])
  //console.log(x)
  //console.log(y)
  //console.log('orig keypoints', keypoints_orig)
  const keypoints_x = keypoints_orig.slice([0, 0], [-1, 1]).sub(x).mul(widthTensor)
  const keypoints_y = keypoints_orig.slice([0, 1], [-1, 1]).sub(y).mul(heightTensor)
  const keypoints_z = keypoints_orig.slice([0, 2], [-1, 1])
  //console.log('x', keypoints_x)
  //console.log('y', keypoints_y)
  //console.log('z', keypoints_z)
  const new_coords = tf.concat([keypoints_x, keypoints_y, keypoints_z], 1)
  //console.log('new keypoints',new_coords)

  return new_coords.arraySync()
}

function sample_avg_color(img, color_coords, square_side_px){
    const sample = img.slice([parseInt(color_coords[0]), parseInt(color_coords[1])],
                             [square_side_px, square_side_px])
    console.log(sample)
    return sample.mean([0, 1], true)
    //sample = img[color_coords[0]: color_coords[0] + square_side_px,
    //             color_coords[1]: color_coords[1] + square_side_px,
    //             :]
    //return sample.mean(axis=(0, 1)).reshape(1, 1, 3)
  }

function boxBlur(img, kernel_size){
  // we assume that image has shape Height, Width, Channels
  const kernel = tf.ones([kernel_size, kernel_size, img.shape[2], img.shape[2]]).div(kernel_size*kernel_size)
  //tf.conv2d (x, filter, strides, pad, dataFormat?, dilations?, dimRoundingMode?)
  return tf.conv2d(img, kernel, [1, 1], 'same').clipByValue(0, 1)
}

function segmentFace(face_img_tensor, keypoints, threshold, sampling_list, blur_kernel_size){
  var mask = tf.zeros([face_img_tensor.shape[0], face_img_tensor.shape[1], 1])
  //console.log('mask', mask)
  sampling_list.forEach(sample_keypoint => {
    const coords = keypoints[sample_keypoint]
    //console.log('coords', coords)
    const color = sample_avg_color(face_img_tensor, coords, 5)
    //console.log('color', color)

    // compute L2 norm
    // tensor, ord='euclidean', axis=None, keepdims=None, name=None
    const color_dist = tf.norm(face_img_tensor.sub(color),'euclidean', [2], true)
    //console.log('color_dist', color_dist)
    const mask_sample = color_dist.less(seg_threshold).cast('int32')
    mask = mask.add(mask_sample)

  })
  mask = mask.clipByValue(0, 1)
  //console.log('mask final', mask)
  mask = boxBlur(mask, box_filter_size)
  mask = tf.image.resizeBilinear(mask, [300, 300])
  return mask
}

// ---------------------- END image processing functions -------------------------

async function renderPrediction() {
  stats.begin();
  tf.engine().startScope();
  const predictions = await model.getFace(state.video, true);

  //ctx.drawImage(state.video, 0, 0);

  const img = tf.browser.fromPixels(state.video)

  if (predictions.length > 0) {
    //const faceSmall = predictions[0].face.squeeze()
    const faceNormal = predictions[0].face2.squeeze()
    console.log(predictions)

    for (const prediction of predictions){
      const keypoints = modifyKeypoints(prediction.scaledMesh,
                                        prediction.boundingBox,
                                        prediction.faceSize);

      const mask = segmentFace(faceNormal, keypoints, seg_threshold,
                               sampling_points, box_filter_size)

      // commented old keypoints render code
      //for (let i = 0; i < keypoints.length; i++) {
        //const x = keypoints[i][0];
        //const y = keypoints[i][1];


        //ctx.beginPath();
        //ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
        //ctx.fill();
        //}
        await tf.browser.toPixels(mask, canvas)
        mask.dispose()
      }

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
