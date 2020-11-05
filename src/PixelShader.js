export default `
#define SIGMA 10.0
#define BSIGMA 0.1
#define MSIZE 15
#define USE_CONSTANT_KERNEL
#define SKIN_DETECTION

uniform sampler2D sourceTexture;
uniform float Brightness;
varying vec2 vUv;

const bool GAMMA_CORRECTION = false;
float kernel[MSIZE];

float normpdf(in float x, in float sigma) {
	return 0.39894 * exp(-0.5 * x * x/ (sigma * sigma)) / sigma;
}
float normpdf3(in vec3 v, in float sigma) {
	return 0.39894 * exp(-0.5 * dot(v,v) / (sigma * sigma)) / sigma;
}
float normalizeColorChannel(in float value, in float min, in float max) {
  return (value - min)/(max-min);
}

void main() {
  vec3 c = texture(sourceTexture, vUv).rgb;
  const int kSize = (MSIZE - 1) / 2;
  vec3 final_colour = vec3(0.0);
  float Z = 0.0;

  kernel[0] = kernel[14] = 0.031225216;
  kernel[1] = kernel[13] = 0.033322271;
  kernel[2] = kernel[12] = 0.035206333;
  kernel[3] = kernel[11] = 0.036826804;
  kernel[4] = kernel[10] = 0.038138565;
  kernel[5] = kernel[9]  = 0.039104044;
  kernel[6] = kernel[8]  = 0.039695028;
  kernel[7] = 0.039894000;
  float bZ = 0.2506642602897679;

  vec3 cc;
  float factor;
  for (int i=-kSize; i <= kSize; ++i) {
    for (int j=-kSize; j <= kSize; ++j) {
      cc = texture(sourceTexture, vUv + vec2(float(i), float(j)) ).rgb;
      factor = normpdf3(cc-c, BSIGMA) * bZ * kernel[kSize+j] * kernel[kSize+i];
      Z += factor;
      final_colour += factor * cc;
    }
  }
  gl_FragColor = vec4(final_colour / Z, 1.0);
  // gl_FragColor = vec4(final_colour / Z, 1.0);
  // gl_FragColor = vec4(texture(sourceTexture, vUv).xyz, 1.0);
  // gl_FragColor = vec4(c, 1.0);
}
`
