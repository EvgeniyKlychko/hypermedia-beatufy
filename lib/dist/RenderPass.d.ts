import * as THREE from 'three';
import { Preset } from "./Preset";
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
    render(): void;
    setPreset(preset: Preset): void;
    private _updateMaterial;
}
