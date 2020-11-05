export default `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
// export default `
//   uniform sampler2D sourceTexture;
//   uniform float Brightness;
//   varying vec2 vUv;
//   void main() {
//     vec4 sourceTextureColor = texture2D(sourceTexture, vUv);
//     vec3 afterBrightness = vec3(
//       sourceTextureColor.r * Brightness,
//       sourceTextureColor.g * Brightness,
//       sourceTextureColor.b * Brightness);
//     gl_FragColor = vec4(afterBrightness, 1.0);
//   }
// `
