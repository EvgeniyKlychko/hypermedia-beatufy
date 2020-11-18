export default function() {
  return `
    #version 100
    precision highp float;
    precision highp int;
    uniform mat4 modelMatrix;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform mat4 viewMatrix;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;

    // varying vec2 vUv;
    void main() {
      // vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `
}
