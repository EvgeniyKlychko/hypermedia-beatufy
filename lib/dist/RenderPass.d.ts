import * as THREE from 'three';
import { Preset } from "./Preset";
/**
 * Use this to render input video on output canvas.
 * @param canvas - { HTMLCanvasElement } output canvas
 * @param video - { HTMLVideoElement } input video
 */
export declare class RenderPass {
    canvas: HTMLCanvasElement;
    video: HTMLVideoElement;
    preset: Preset;
    time: Date;
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    geometry: THREE.BoxGeometry;
    renderer: THREE.WebGLRenderer;
    texture: THREE.VideoTexture;
    material: THREE.ShaderMaterial;
    mesh: THREE.Mesh;
    constructor(canvas: HTMLCanvasElement, video: HTMLVideoElement);
    /**
     * Renders video on canvas with blur
     */
    render(): void;
    /**
     * Apply new settings of blurring
     * @param preset - { Preset } new preset to use
     */
    setPreset(preset: Preset): void;
    private _updateMaterial;
}
