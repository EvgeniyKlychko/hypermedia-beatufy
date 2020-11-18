export class VideoManager {

  constructor() {
    this.video = null;
  }

  async load(videoId) {
    console.info('VideoManager.load()');
    this.video = await setupCamera();
    this.video.play();
    console.log('video', video);
    async function setupCamera() {
      console.info('VideoManager.setupCamera()');
      const videoElement = document.getElementById(videoId);
      const options = {
        audio: false,
        video: {
          width: 1080,
          height: 720,
          facingMode: 'user'
        },
      };
      return new Promise(async (resolve, reject) => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn('no getUserMedia available');
          // if (navigator.webkitGetUserMedia) {
          //   console.log('using webkitGetUserMedia');
          //   navigator.webkitGetUserMedia(options, () => {
          //     console.log('webkitGetUserMedia success');
          //     resolve(videoElement);
          //   }, (error) => {
          //     console.warn('webkitGetUserMedia error', error);
          //     reject(error);
          //   });
          // } else {
          // }
          reject(new Error('Browser API navigator.mediaDevices.getUserMedia not available'));
        } else {
          videoElement.srcObject = await navigator.mediaDevices.getUserMedia(options);
          videoElement.onloadedmetadata = () => {
            videoElement.width = videoElement.videoWidth;
            videoElement.height = videoElement.videoHeight;
            resolve(videoElement);
          };
        }
      });
    }
  }
}
