/**
 * Returns vertex shader GLSL code;
 */
export const VertexShader = function() {
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

    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `
};

/**
 * Returns fragment shader GLSL code;
 * @param MSIZE - { number } radius of blur
 * @param SKIN_DETECTION - { boolean } if should use skin mask to apply blur
 */
export const PixelShader = function(MSIZE = 15, SKIN_DETECTION = true) {
  return `
    #version 100
    #define MSIZE ${MSIZE}
    ${ SKIN_DETECTION ? '#define SKIN_DETECTION' : '' }
    precision highp float;
    precision highp int;
    uniform vec3 iResolution;
    uniform float iTime;
    uniform sampler2D iChannel0;
    uniform float Brightness;
    uniform float SIGMA;
    uniform float BSIGMA;
    // varying vec2 vUv;
    vec3 iMouse = vec3(0,0,0);

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

    void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
      vec3 c = texture2D(iChannel0, (fragCoord.xy / iResolution.xy)).rgb;
      const int kSize = (MSIZE - 1) / 2;
      vec3 final_colour = vec3(0.0);
      float Z = 0.0;

      // #ifdef USE_CONSTANT_KERNEL
      //   // unfortunately, WebGL 1.0 does not support constant arrays...
      //   kernel[0] = kernel[14] = 0.031225216;
      //   kernel[1] = kernel[13] = 0.033322271;
      //   kernel[2] = kernel[12] = 0.035206333;
      //   kernel[3] = kernel[11] = 0.036826804;
      //   kernel[4] = kernel[10] = 0.038138565;
      //   kernel[5] = kernel[9]  = 0.039104044;
      //   kernel[6] = kernel[8]  = 0.039695028;
      //   kernel[7] = 0.039894000;
      //   float bZ = 0.2506642602897679;
      // #else
        //create the 1-D kernel
        for (int j = 0; j <= kSize; ++j) {
          kernel[kSize+j] = kernel[kSize-j] = normpdf(float(j), SIGMA);
        }
        float bZ = 1.0 / normpdf(0.0, BSIGMA);
      // #endif

      vec3 cc;
      float factor;
      //read out the texels
      for (int i=-kSize; i <= kSize; ++i) {
        for (int j=-kSize; j <= kSize; ++j) {
          cc = texture2D(iChannel0, (fragCoord.xy+vec2(float(i),float(j))) / iResolution.xy).rgb;
          factor = normpdf3(cc-c, BSIGMA) * bZ * kernel[kSize+j] * kernel[kSize+i];
          Z += factor;
          if (GAMMA_CORRECTION) {
            final_colour += factor * pow(cc, vec3(2.2));
          } else {
            final_colour += factor * cc;
          }
        }
      }

      if (GAMMA_CORRECTION) {
        fragColor = vec4(pow(final_colour / Z, vec3(1.0/2.2)), 1.0);
      } else {
        fragColor = vec4(final_colour / Z, 1.0);
      }

      bool isSkin = true;
      #ifdef SKIN_DETECTION
        isSkin = false;
        vec4 rgb = fragColor * 255.0;
        vec4 ycbcr = rgb;
        ycbcr.x = 16.0 + rgb.x*0.257 + rgb.y*0.504 + rgb.z*0.098;
        ycbcr.y = 128.0 - rgb.x*0.148 - rgb.y*0.291 + rgb.z*0.439;
        ycbcr.z = 128.0 + rgb.x*0.439 - rgb.y*0.368 - rgb.z*0.071;
        if (ycbcr.y > 100.0 && ycbcr.y < 118.0 && ycbcr.z > 121.0 && ycbcr.z < 161.0) {
          isSkin = true;
        }
      #endif

      if (iMouse.z > 0.0 || !isSkin) {
        fragColor = vec4(texture2D(iChannel0, fragCoord.xy / iResolution.xy).xyz, 1.0);
      }

      fragColor = vec4(fragColor.xyz * Brightness, 1.0);
    }

    void main() {
      mainImage(gl_FragColor, gl_FragCoord.xy);
    }
  `
}
