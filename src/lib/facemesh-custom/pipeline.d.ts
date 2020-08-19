import * as blazeface from '@tensorflow-models/blazeface';
import * as tfconv from '@tensorflow/tfjs-converter';
import * as tf from '@tensorflow/tfjs-core';
import { Box } from './box';
import { Coords3D, TransformationMatrix } from './util';
export declare type Prediction = {
    coords: tf.Tensor2D;
    scaledCoords: tf.Tensor2D;
    box: Box;
    flag: tf.Scalar;
    face?: any;
    face2?: any;
};
export declare class Pipeline {
    private boundingBoxDetector;
    private meshDetector;
    private meshWidth;
    private meshHeight;
    private maxContinuousChecks;
    private maxFaces;
    private regionsOfInterest;
    private runsWithoutFaceDetector;
    constructor(boundingBoxDetector: blazeface.BlazeFaceModel, meshDetector: tfconv.GraphModel, meshWidth: number, meshHeight: number, maxContinuousChecks: number, maxFaces: number);
    transformRawCoords(rawCoords: Coords3D, box: Box, angle: number, rotationMatrix: TransformationMatrix): [number, number, number][];
    predict(input: tf.Tensor4D): Promise<Prediction[]>;
    getFace(input: tf.Tensor4D): Promise<Prediction[]>;
    updateRegionsOfInterest(boxes: Box[]): void;
    clearRegionOfInterest(index: number): void;
    shouldUpdateRegionsOfInterest(): boolean;
    calculateLandmarksBoundingBox(landmarks: Coords3D): Box;
}
