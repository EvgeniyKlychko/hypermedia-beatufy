/**
 * Returns vertex shader GLSL code;
 */
export declare const VertexShader: () => string;
/**
 * Returns fragment shader GLSL code;
 * @param MSIZE - { number } radius of blur
 * @param SKIN_DETECTION - { boolean } if should use skin mask to apply blur
 */
export declare const PixelShader: (MSIZE?: number, SKIN_DETECTION?: boolean) => string;
