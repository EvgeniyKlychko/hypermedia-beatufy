"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tf = require("@tensorflow/tfjs-core");
const box_1 = require("./box");
const util_1 = require("./util");
const UPDATE_REGION_OF_INTEREST_IOU_THRESHOLD = 0.25;
const LANDMARKS_COUNT = 468;
const MESH_MODEL_KEYPOINTS_LINE_OF_SYMMETRY_INDICES = [1, 168];
const BLAZEFACE_KEYPOINTS_LINE_OF_SYMMETRY_INDICES = [3, 2];
class Pipeline {
    constructor(boundingBoxDetector, meshDetector, meshWidth, meshHeight, maxContinuousChecks, maxFaces) {
        this.regionsOfInterest = [];
        this.runsWithoutFaceDetector = 0;
        this.boundingBoxDetector = boundingBoxDetector;
        this.meshDetector = meshDetector;
        this.meshWidth = meshWidth;
        this.meshHeight = meshHeight;
        this.maxContinuousChecks = maxContinuousChecks;
        this.maxFaces = maxFaces;
    }
    transformRawCoords(rawCoords, box, angle, rotationMatrix) {
        const boxSize = box_1.getBoxSize({ startPoint: box.startPoint, endPoint: box.endPoint });
        const scaleFactor = [boxSize[0] / this.meshWidth, boxSize[1] / this.meshHeight];
        const coordsScaled = rawCoords.map(coord => {
            return [
                scaleFactor[0] * (coord[0] - this.meshWidth / 2),
                scaleFactor[1] * (coord[1] - this.meshHeight / 2), coord[2]
            ];
        });
        const coordsRotationMatrix = util_1.buildRotationMatrix(angle, [0, 0]);
        const coordsRotated = coordsScaled.map((coord) => {
            const rotated = util_1.rotatePoint(coord, coordsRotationMatrix);
            return [...rotated, coord[2]];
        });
        const inverseRotationMatrix = util_1.invertTransformMatrix(rotationMatrix);
        const boxCenter = [
            ...box_1.getBoxCenter({ startPoint: box.startPoint, endPoint: box.endPoint }), 1
        ];
        const originalBoxCenter = [
            util_1.dot(boxCenter, inverseRotationMatrix[0]),
            util_1.dot(boxCenter, inverseRotationMatrix[1])
        ];
        return coordsRotated.map((coord) => ([
            coord[0] + originalBoxCenter[0],
            coord[1] + originalBoxCenter[1], coord[2]
        ]));
    }
    async predict(input) {
        if (this.shouldUpdateRegionsOfInterest()) {
            const returnTensors = false;
            const annotateFace = true;
            const { boxes, scaleFactor } = await this.boundingBoxDetector.getBoundingBoxes(input, returnTensors, annotateFace);
            if (boxes.length === 0) {
                this.regionsOfInterest = [];
                return null;
            }
            const scaledBoxes = boxes.map((prediction) => {
                const predictionBoxCPU = {
                    startPoint: prediction.box.startPoint.squeeze().arraySync(),
                    endPoint: prediction.box.endPoint.squeeze().arraySync()
                };
                const scaledBox = box_1.scaleBoxCoordinates(predictionBoxCPU, scaleFactor);
                const enlargedBox = box_1.enlargeBox(scaledBox);
                return Object.assign({}, enlargedBox, { landmarks: prediction.landmarks.arraySync() });
            });
            boxes.forEach((box) => {
                if (box != null && box.startPoint != null) {
                    box.startEndTensor.dispose();
                    box.startPoint.dispose();
                    box.endPoint.dispose();
                }
            });
            this.updateRegionsOfInterest(scaledBoxes);
            this.runsWithoutFaceDetector = 0;
        }
        else {
            this.runsWithoutFaceDetector++;
        }
        return tf.tidy(() => {
            return this.regionsOfInterest.map((box, i) => {
                let angle;
                const boxLandmarksFromMeshModel = box.landmarks.length === LANDMARKS_COUNT;
                if (boxLandmarksFromMeshModel) {
                    const [indexOfNose, indexOfForehead] = MESH_MODEL_KEYPOINTS_LINE_OF_SYMMETRY_INDICES;
                    angle = util_1.computeRotation(box.landmarks[indexOfNose], box.landmarks[indexOfForehead]);
                }
                else {
                    const [indexOfNose, indexOfForehead] = BLAZEFACE_KEYPOINTS_LINE_OF_SYMMETRY_INDICES;
                    angle = util_1.computeRotation(box.landmarks[indexOfNose], box.landmarks[indexOfForehead]);
                }
                const faceCenter = box_1.getBoxCenter({ startPoint: box.startPoint, endPoint: box.endPoint });
                const faceCenterNormalized = [faceCenter[0] / input.shape[2], faceCenter[1] / input.shape[1]];
                const rotatedImage = tf.image.rotateWithOffset(input, angle, 0, faceCenterNormalized);
                const rotationMatrix = util_1.buildRotationMatrix(-angle, faceCenter);
                const boxCPU = { startPoint: box.startPoint, endPoint: box.endPoint };
                const face = box_1.cutBoxFromImageAndResize(boxCPU, rotatedImage, [
                    this.meshHeight, this.meshWidth
                ]).div(255);
                const [, flag, coords] = this.meshDetector.predict(face);
                const coordsReshaped = tf.reshape(coords, [-1, 3]);
                const rawCoords = coordsReshaped.arraySync();
                const transformedCoordsData = this.transformRawCoords(rawCoords, box, angle, rotationMatrix);
                const transformedCoords = tf.tensor2d(transformedCoordsData);
                const landmarksBox = this.calculateLandmarksBoundingBox(transformedCoordsData);
                this.regionsOfInterest[i] = Object.assign({}, landmarksBox, { landmarks: transformedCoords.arraySync() });
                const prediction = {
                    coords: coordsReshaped,
                    scaledCoords: transformedCoords,
                    box: landmarksBox,
                    flag: flag.squeeze()
                };
                return prediction;
            });
        });
    }
    async getFace(input) {
        if (this.shouldUpdateRegionsOfInterest()) {
            const returnTensors = false;
            const annotateFace = true;
            const { boxes, scaleFactor } = await this.boundingBoxDetector.getBoundingBoxes(input, returnTensors, annotateFace);
            if (boxes.length === 0) {
                this.regionsOfInterest = [];
                return null;
            }
            const scaledBoxes = boxes.map((prediction) => {
                const predictionBoxCPU = {
                    startPoint: prediction.box.startPoint.squeeze().arraySync(),
                    endPoint: prediction.box.endPoint.squeeze().arraySync()
                };
                const scaledBox = box_1.scaleBoxCoordinates(predictionBoxCPU, scaleFactor);
                const enlargedBox = box_1.enlargeBox(scaledBox);
                return Object.assign({}, enlargedBox, { landmarks: prediction.landmarks.arraySync() });
            });
            boxes.forEach((box) => {
                if (box != null && box.startPoint != null) {
                    box.startEndTensor.dispose();
                    box.startPoint.dispose();
                    box.endPoint.dispose();
                }
            });
            this.updateRegionsOfInterest(scaledBoxes);
            this.runsWithoutFaceDetector = 0;
        }
        else {
            this.runsWithoutFaceDetector++;
        }
        return tf.tidy(() => {
            return this.regionsOfInterest.map((box, i) => {
                let angle;
                const boxLandmarksFromMeshModel = box.landmarks.length === LANDMARKS_COUNT;
                if (boxLandmarksFromMeshModel) {
                    const [indexOfNose, indexOfForehead] = MESH_MODEL_KEYPOINTS_LINE_OF_SYMMETRY_INDICES;
                    angle = util_1.computeRotation(box.landmarks[indexOfNose], box.landmarks[indexOfForehead]);
                }
                else {
                    const [indexOfNose, indexOfForehead] = BLAZEFACE_KEYPOINTS_LINE_OF_SYMMETRY_INDICES;
                    angle = util_1.computeRotation(box.landmarks[indexOfNose], box.landmarks[indexOfForehead]);
                }
                const faceCenter = box_1.getBoxCenter({ startPoint: box.startPoint, endPoint: box.endPoint });
                const faceCenterNormalized = [faceCenter[0] / input.shape[2], faceCenter[1] / input.shape[1]];
                const rotatedImage = tf.image.rotateWithOffset(input, angle, 0, faceCenterNormalized);
                const rotationMatrix = util_1.buildRotationMatrix(-angle, faceCenter);
                const boxCPU = { startPoint: box.startPoint, endPoint: box.endPoint };
                const face = box_1.cutBoxFromImageAndResize(boxCPU, rotatedImage, [
                    this.meshHeight, this.meshWidth
                ]).div(255);
                const face2 = box_1.cutBoxFromImageAndResize(boxCPU, input, [
                    this.meshHeight, this.meshWidth
                ]).div(255);
                const [, flag, coords] = this.meshDetector.predict(face);
                const coordsReshaped = tf.reshape(coords, [-1, 3]);
                const rawCoords = coordsReshaped.arraySync();
                const transformedCoordsData = this.transformRawCoords(rawCoords, box, angle, rotationMatrix);
                const transformedCoords = tf.tensor2d(transformedCoordsData);
                const landmarksBox = this.calculateLandmarksBoundingBox(transformedCoordsData);
                this.regionsOfInterest[i] = Object.assign({}, landmarksBox, { landmarks: transformedCoords.arraySync() });
                const prediction = {
                    face,
                    face2,
                    faceSize: box_1.getBoxSize(box),
                    coords: coordsReshaped,
                    scaledCoords: transformedCoords,
                    box: landmarksBox,
                    flag: flag.squeeze()
                };
                return prediction;
            });
        });
    }
    updateRegionsOfInterest(boxes) {
        for (let i = 0; i < boxes.length; i++) {
            const box = boxes[i];
            const previousBox = this.regionsOfInterest[i];
            let iou = 0;
            if (previousBox && previousBox.startPoint) {
                const [boxStartX, boxStartY] = box.startPoint;
                const [boxEndX, boxEndY] = box.endPoint;
                const [previousBoxStartX, previousBoxStartY] = previousBox.startPoint;
                const [previousBoxEndX, previousBoxEndY] = previousBox.endPoint;
                const xStartMax = Math.max(boxStartX, previousBoxStartX);
                const yStartMax = Math.max(boxStartY, previousBoxStartY);
                const xEndMin = Math.min(boxEndX, previousBoxEndX);
                const yEndMin = Math.min(boxEndY, previousBoxEndY);
                const intersection = (xEndMin - xStartMax) * (yEndMin - yStartMax);
                const boxArea = (boxEndX - boxStartX) * (boxEndY - boxStartY);
                const previousBoxArea = (previousBoxEndX - previousBoxStartX) *
                    (previousBoxEndY - boxStartY);
                iou = intersection / (boxArea + previousBoxArea - intersection);
            }
            if (iou < UPDATE_REGION_OF_INTEREST_IOU_THRESHOLD) {
                this.regionsOfInterest[i] = box;
            }
        }
        this.regionsOfInterest = this.regionsOfInterest.slice(0, boxes.length);
    }
    clearRegionOfInterest(index) {
        if (this.regionsOfInterest[index] != null) {
            this.regionsOfInterest = [
                ...this.regionsOfInterest.slice(0, index),
                ...this.regionsOfInterest.slice(index + 1)
            ];
        }
    }
    shouldUpdateRegionsOfInterest() {
        const roisCount = this.regionsOfInterest.length;
        const noROIs = roisCount === 0;
        if (this.maxFaces === 1 || noROIs) {
            return noROIs;
        }
        return roisCount !== this.maxFaces &&
            this.runsWithoutFaceDetector >= this.maxContinuousChecks;
    }
    calculateLandmarksBoundingBox(landmarks) {
        const xs = landmarks.map(d => d[0]);
        const ys = landmarks.map(d => d[1]);
        const startPoint = [Math.min(...xs), Math.min(...ys)];
        const endPoint = [Math.max(...xs), Math.max(...ys)];
        const box = { startPoint, endPoint };
        return box_1.enlargeBox({ startPoint: box.startPoint, endPoint: box.endPoint });
    }
}
exports.Pipeline = Pipeline;
//# sourceMappingURL=pipeline.js.map