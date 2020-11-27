export class VideoManager {

  constructor() {
    this.video = null;
  }

  async load(videoElement) {
    console.info('VideoManager.load()');
    this.video = await setupCamera();
    this.video.play();
    async function setupCamera() {
      console.info('VideoManager.setupCamera()');
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
