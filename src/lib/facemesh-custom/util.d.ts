export declare type Coord2D = [number, number];
export declare type Coord3D = [number, number, number];
export declare type Coords3D = Coord3D[];
export declare type TransformationMatrix = [[number, number, number], [number, number, number], [number, number, number]];
export declare function normalizeRadians(angle: number): number;
export declare function computeRotation(point1: Coord2D | Coord3D, point2: Coord2D | Coord3D): number;
export declare function radToDegrees(rad: number): number;
export declare function dot(v1: number[], v2: number[]): number;
export declare function getColumnFrom2DArr(arr: number[][], columnIndex: number): number[];
export declare function buildRotationMatrix(rotation: number, center: Coord2D): TransformationMatrix;
export declare function invertTransformMatrix(matrix: TransformationMatrix): TransformationMatrix;
export declare function rotatePoint(homogeneousCoordinate: Coord3D, rotationMatrix: TransformationMatrix): Coord2D;
