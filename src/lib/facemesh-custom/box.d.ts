import * as tf from '@tensorflow/tfjs-core';
import { Coord2D, Coords3D } from './util';
export declare type Box = {
    startPoint: Coord2D;
    endPoint: Coord2D;
    landmarks?: Coords3D;
};
export declare function scaleBoxCoordinates(box: Box, factor: Coord2D): Box;
export declare function getBoxSize(box: Box): Coord2D;
export declare function getBoxCenter(box: Box): Coord2D;
export declare function cutBoxFromImageAndResize(box: Box, image: tf.Tensor4D, cropSize: Coord2D): tf.Tensor4D;
export declare function enlargeBox(box: Box, factor?: number): Box;
