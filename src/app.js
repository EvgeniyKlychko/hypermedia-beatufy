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
const seg_threshold = tf.tensor1d([0.08])
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

  const keypoints_x = keypoints_orig.slice([0, 0], [-1, 1]).sub(x).mul(widthTensor)
  const keypoints_y = keypoints_orig.slice([0, 1], [-1, 1]).sub(y).mul(heightTensor)
  const keypoints_z = keypoints_orig.slice([0, 2], [-1, 1])

  const new_coords = tf.concat([keypoints_x, keypoints_y, keypoints_z], 1)

  return new_coords.arraySync()
}

function sample_avg_color(img, color_coords, square_side_px){
    const sample = img.slice([parseInt(color_coords[0]), parseInt(color_coords[1])],
                             [square_side_px, square_side_px])
    console.log(sample)
    return sample.mean([0, 1], true)
  }

function boxBlur(mask, kernel_size){
  // we assume that mask has shape (Height, Width, Channels)
  const kernel = tf.ones([kernel_size, kernel_size, mask.shape[2], mask.shape[2]]).div(kernel_size*kernel_size)
  //tf.conv2d (x, filter, strides, pad, dataFormat?, dilations?, dimRoundingMode?)
  return tf.conv2d(mask, kernel, [1, 1], 'same').clipByValue(0, 1)
}

function segmentFace(face_img_tensor, face_img_tensor_small, keypoints,
                     threshold, sampling_list, blur_kernel_size){

  var mask = tf.zeros([face_img_tensor_small.shape[0],
                       face_img_tensor_small.shape[1], 1])
  //console.log('mask', mask)
  sampling_list.forEach(sample_keypoint => {
    const coords = keypoints[sample_keypoint]

    const color = sample_avg_color(face_img_tensor_small, coords, sample_size_px)

    // compute L2 norm
    // (tensor, ord='euclidean', axis=None, keepdims=None, name=None) - params
    const color_dist = tf.norm(face_img_tensor_small.sub(color),'euclidean', [2], true)

    const mask_sample = color_dist.less(seg_threshold).cast('int32')
    mask = mask.add(mask_sample)

  })
  mask = mask.clipByValue(0, 1)
  mask = tf.image.resizeBilinear(mask, [face_img_tensor.shape[0], face_img_tensor.shape[1]])
  mask = boxBlur(mask, box_filter_size)

  face_img_tensor = face_img_tensor.mul(mask.greater(0))

  return [face_img_tensor, mask]
}

function increase_brightnessv3(rgb_img, value){
  const rChannel = (rgb_img.slice([0, 0, 0], [-1, -1, 1])).add((tf.tensor1d([1]).sub(rgb_img.slice([0, 0, 0], [-1, -1, 1]))).mul(value))
  const gChannel = (rgb_img.slice([0, 0, 1], [-1, -1, 1])).add((tf.tensor1d([1]).sub(rgb_img.slice([0, 0, 1], [-1, -1, 1]))).mul(value))
  const bChannel = (rgb_img.slice([0, 0, 2], [-1, -1, 1])).add((tf.tensor1d([1]).sub(rgb_img.slice([0, 0, 2], [-1, -1, 1]))).mul(value))
  const new_img = tf.concat([rChannel, gChannel, bChannel], 2)
  return new_img.clipByValue(0, 1)
}

function convole_gaussian(img, kernel){
  return tf.depthwiseConv2d(img, kernel, [1, 1], 'same').clipByValue(0, 1)
}

function alpha_blend_simple(background_rgb, overlay_rgb, aplha_mask){
  //return (background_rgb * (1 - aplha_mask)) + (overlay_rgb * aplha_mask) - from python
  return (background_rgb.mul(tf.tensor1d([1]).sub(aplha_mask))).add(overlay_rgb.mul(aplha_mask))
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
    var faceNormal = predictions[0].face2.squeeze()
    console.log(predictions)

    for (const prediction of predictions){
      const keypoints = modifyKeypoints(prediction.scaledMesh,
                                        prediction.boundingBox,
                                        prediction.faceSize);

      var [seg_skin, mask] = segmentFace(faceNormal, faceNormal, keypoints,
                                         seg_threshold, sampling_points,
                                         box_filter_size)

      // commented keypoints render code
      //for (let i = 0; i < keypoints.length; i++) {
        //const x = keypoints[i][0];
        //const y = keypoints[i][1];


        //ctx.beginPath();
        //ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
        //ctx.fill();
        //}
        //whitening
        seg_skin = increase_brightnessv3(seg_skin, brightness_boost)
        // skin smoothing
        seg_skin = convole_gaussian(seg_skin, gaussian_kernel)
        // adding to the original image
        faceNormal = alpha_blend_simple(faceNormal, seg_skin, mask)
        await tf.browser.toPixels(faceNormal, canvas)
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
