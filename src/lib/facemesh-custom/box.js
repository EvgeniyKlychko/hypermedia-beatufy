"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tf = require("@tensorflow/tfjs-core");
function scaleBoxCoordinates(box, factor) {
    const startPoint = [box.startPoint[0] * factor[0], box.startPoint[1] * factor[1]];
    const endPoint = [box.endPoint[0] * factor[0], box.endPoint[1] * factor[1]];
    return { startPoint, endPoint };
}
exports.scaleBoxCoordinates = scaleBoxCoordinates;
function getBoxSize(box) {
    return [
        Math.abs(box.endPoint[0] - box.startPoint[0]),
        Math.abs(box.endPoint[1] - box.startPoint[1])
    ];
}
exports.getBoxSize = getBoxSize;
function getBoxCenter(box) {
    return [
        box.startPoint[0] + (box.endPoint[0] - box.startPoint[0]) / 2,
        box.startPoint[1] + (box.endPoint[1] - box.startPoint[1]) / 2
    ];
}
exports.getBoxCenter = getBoxCenter;
function cutBoxFromImageAndResize(box, image, cropSize) {
    const h = image.shape[1];
    const w = image.shape[2];
    const boxes = [[
            box.startPoint[1] / h, box.startPoint[0] / w, box.endPoint[1] / h,
            box.endPoint[0] / w
        ]];
    return tf.image.cropAndResize(image, boxes, [0], cropSize);
}
exports.cutBoxFromImageAndResize = cutBoxFromImageAndResize;
function enlargeBox(box, factor = 1.5) {
    const center = getBoxCenter(box);
    const size = getBoxSize(box);
    const newHalfSize = [factor * size[0] / 2, factor * size[1] / 2];
    const startPoint = [center[0] - newHalfSize[0], center[1] - newHalfSize[1]];
    const endPoint = [center[0] + newHalfSize[0], center[1] + newHalfSize[1]];
    return { startPoint, endPoint, landmarks: box.landmarks };
}
exports.enlargeBox = enlargeBox;
//# sourceMappingURL=box.js.map