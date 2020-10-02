import * as tf from "@tensorflow/tfjs"
const sample_size_px = 3
const face_edge_idx = [152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54,
  103, 67, 109, 10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152]
const lips_idx = [0, 37, 39, 40, 185, 61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0]
const right_eye_idx = [130, 247, 30, 29, 27, 28, 56, 190, 243, 112, 26, 22, 23, 24, 110, 25, 130]
const left_eye_idx = [359, 467, 260, 259, 257, 258, 286, 414, 463, 341, 256, 252, 253, 254, 339, 255, 359]

export function segmentFaceContour(face_img_tensor, face_img_tensor_small,
                            keypoints_all, blur_kernel_size){
  //console.log()
  const img_height = face_img_tensor_small.shape[1]
  const img_width = face_img_tensor_small.shape[0]

  let mask_face = new cv.Mat.zeros(img_height, img_width, cv.CV_8UC1)
  let mask_eyes = new cv.Mat.zeros(img_height, img_width, cv.CV_8UC1)
  let mask_lips = new cv.Mat.zeros(img_height, img_width, cv.CV_8UC1)

  let face_points = keypoints_to_pts(face_edge_idx, keypoints_all)
  cv.fillPoly(mask_face, face_points, new cv.Scalar(1));
  //console.log('mask_face', mask_face)

  let eyes_points = keypoints_to_pts(right_eye_idx.concat(left_eye_idx), keypoints_all)
  cv.fillPoly(mask_eyes, eyes_points, new cv.Scalar(1));
  //console.log('mask_eyes', mask_eyes)

  let lips_points = keypoints_to_pts(lips_idx, keypoints_all)
  cv.fillPoly(mask_lips, lips_points, new cv.Scalar(1));
  //console.log('mask_lips', mask_lips)
  // converting from open cv Mat() to tf.Tensor()
  const mask_face_tf = tf.tensor3d(mask_face.data, [img_width, img_height, 1])
  const mask_eyes_tf = tf.tensor3d(mask_eyes.data, [img_width, img_height, 1])
  const mask_lips_tf = tf.tensor3d(mask_lips.data, [img_width, img_height, 1])

  mask_face.delete()
  mask_eyes.delete()
  mask_lips.delete()

  var mask = mask_face_tf.sub(mask_eyes_tf).sub(mask_lips_tf).clipByValue(0, 1)
  //console.log(mask)
  mask = tf.image.resizeBilinear(mask, [face_img_tensor.shape[0], face_img_tensor.shape[1]])
  mask = boxBlur(mask, blur_kernel_size)

  face_img_tensor = face_img_tensor.mul(mask.greater(0))
  return [face_img_tensor, mask]
}

export function segmentFace(face_img_tensor, face_img_tensor_small, keypoints,
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

    const mask_sample = color_dist.less(threshold).cast('int32')
    mask = mask.add(mask_sample)

  })
  mask = mask.clipByValue(0, 1)
  mask = tf.image.resizeBilinear(mask, [face_img_tensor.shape[0], face_img_tensor.shape[1]])
  mask = boxBlur(mask, blur_kernel_size)

  face_img_tensor = face_img_tensor.mul(mask.greater(0))

  return [face_img_tensor, mask]
}

function sample_avg_color(img, color_coords, square_side_px){
  const sample = img.slice([parseInt(color_coords[0]), parseInt(color_coords[1])],
      [square_side_px, square_side_px])
  return sample.mean([0, 1], true)
}

function keypoints_to_pts(keypoints_specific, keypoints_all){
  // keypoints_all - detected keypoint coordinates from the model
  // keypoints_specific list of keypoint numbers for face part (eyes, lips, etc.)
  let square_point_data = []
  for (var i = 0; i < keypoints_specific.length; i++) {
    square_point_data.push(keypoints_all[keypoints_specific[i]][0],
        keypoints_all[keypoints_specific[i]][1])
  }
  //let square_point_data = new Uint8Array([
  //    1, 1,
  //    4, 1,
  //    4, 4,
  //    1, 4]);
  let npts = square_point_data.length / 2;

  let square_points = cv.matFromArray(npts, 1, cv.CV_32SC2, square_point_data);
  let pts = new cv.MatVector();
  pts.push_back (square_points);

  square_points.delete();
  return pts
}


function boxBlur(mask, kernel_size){
  // we assume that mask has shape (Height, Width, Channels)
  const kernel = tf.ones([kernel_size, kernel_size, mask.shape[2], mask.shape[2]]).div(kernel_size*kernel_size)
  //tf.conv2d (x, filter, strides, pad, dataFormat?, dilations?, dimRoundingMode?)
  return tf.conv2d(mask, kernel, [1, 1], 'same').clipByValue(0, 1)
}


export function increase_brightnessv3(rgb_img, value){
  const rChannel = (rgb_img.slice([0, 0, 0], [-1, -1, 1])).add((tf.tensor1d([1]).sub(rgb_img.slice([0, 0, 0], [-1, -1, 1]))).mul(value))
  const gChannel = (rgb_img.slice([0, 0, 1], [-1, -1, 1])).add((tf.tensor1d([1]).sub(rgb_img.slice([0, 0, 1], [-1, -1, 1]))).mul(value))
  const bChannel = (rgb_img.slice([0, 0, 2], [-1, -1, 1])).add((tf.tensor1d([1]).sub(rgb_img.slice([0, 0, 2], [-1, -1, 1]))).mul(value))
  const new_img = tf.concat([rChannel, gChannel, bChannel], 2)
  return new_img.clipByValue(0, 1)
}

export function convole_gaussian(img, kernel){
  return tf.depthwiseConv2d(img, kernel, [1, 1], 'same').clipByValue(0, 1)
}

export function alpha_blend_simple(background_rgb, overlay_rgb, aplha_mask){
  //return (background_rgb * (1 - aplha_mask)) + (overlay_rgb * aplha_mask) - from python
  return (background_rgb.mul(tf.tensor1d([1]).sub(aplha_mask))).add(overlay_rgb.mul(aplha_mask))
}


//// ------- filters v2 (high pass - low pass)
/*
# source https://stackoverflow.com/questions/6094957/high-pass-filter-for-image-processing-in-python-by-using-scipy-numpy
def simple_lowpass(image):
    kernel = np.array([[-1, -1, -1, -1, -1],
                       [-1,  1,  2,  1, -1],
                       [-1,  2,  4,  2, -1],
                       [-1,  1,  2,  1, -1],
                       [-1, -1, -1, -1, -1]])
    # kernel = kernel[None, :, :]
    highpass = ndimage.convolve(color.rgb2gray(image), kernel)
    return highpass

def normalize_0_1(image):
    image = image - image.min()
    return image/(image.max())

# aplha blend source https://gist.github.com/pthom/5155d319a7957a38aeb2ac9e54cc0999
def alpha_blend_simple(background_rgb, overlay_rgb, aplha_mask):
    return (background_rgb * (1 - aplha_mask)) + (overlay_rgb * aplha_mask)

def smooth(image, sigma):
    return gaussian(image, sigma=sigma)

def low_pass_high_pass_v1(image, highp_thresh=0.4, smooth_sig=3):
    edge_mask = simple_lowpass(image)
    # edge_mask = smooth(edge_mask, 1.2)

    edge_mask = normalize_0_1(edge_mask)[:, :, None]
    edge_mask_thresh = edge_mask < highp_thresh
    out_mask = cv2.blur(edge_mask_thresh.astype(np.float32), (5, 5))[:, :, None]

    high_freq = image * edge_mask_thresh
    low_freq_smoothed = smooth(image, smooth_sig)

    out = alpha_blend_simple(low_freq_smoothed, image, out_mask)

    return (edge_mask_thresh, out_mask, high_freq, low_freq_smoothed, out)

*/

function gaussian_kernel2d(sigma, truncate_sd){
  let radius = parseInt(truncate_sd * sigma + 0.5)
  // Computes a 1-D zero order Gaussian convolution kernel.
  // sigma2 = sigma * sigma
  // x = np.arange(-radius, radius+1)
  // phi_x = np.exp(-0.5 / sigma2 * x ** 2)
  // phi_x = phi_x / phi_x.sum()
  let sigma2 = tf.tensor1d([sigma * sigma])
  let x = tf.range(-radius, radius+1)
  let phi_x = ((tf.tensor1d([-0.5]).div(sigma2)).mul(x.pow(2))).exp()
  phi_x = phi_x.div(phi_x.sum())

  let weights = tf.reverse(phi_x)
  // return outer product of 1d convolutional kernel to perform 2d conv
  let kernel2d = (weights.reshape([1, -1])).mul(weights.reshape([-1, 1]))
  return kernel2d.reshape([kernel2d.shape[0], kernel2d.shape[1], 1, 1])
}

function simpleLowpass(image){
  const kernel = tf.tensor4d([-1, -1, -1, -1, -1,
                              -1,  1,  2,  1, -1,
                              -1,  2,  4,  2, -1,
                              -1,  1,  2,  1, -1,
                              -1, -1, -1, -1, -1],
                              [5, 5, 1, 1])

  const kernel_3d = tf.concat([kernel, kernel, kernel], 2)
  return tf.depthwiseConv2d(image, kernel_3d, [1, 1], 'same')
}

function normalize_0_1(image){
  image = image.sub(image.min())
  return image.div(image.max())
}

export function lowPassHighPass(image, high_pass_threshold, blur_sigma, truncation_thresh_kernel){
  const gaussian_kernel_single_ch = gaussian_kernel2d(blur_sigma, truncation_thresh_kernel)

  const gaussian_kernel = tf.concat([gaussian_kernel_single_ch,
                                     gaussian_kernel_single_ch,
                                     gaussian_kernel_single_ch], 2)

  let edge_mask = simpleLowpass(image)
  edge_mask = normalize_0_1(edge_mask)

  const edge_mask_thresh = edge_mask.less(tf.tensor1d([high_pass_threshold]))
  const out_mask = boxBlur(edge_mask_thresh, 5)

  const high_freq = image.mul(edge_mask_thresh)
  const low_freq_smoothed = convole_gaussian(image, gaussian_kernel)

  const out = alpha_blend_simple(low_freq_smoothed, image, out_mask)
  return out
}
