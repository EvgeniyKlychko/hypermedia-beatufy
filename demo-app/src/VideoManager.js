export class VideoManager {

  constructor() {
    this.video = null;
  }

  async load(videoId) {
    this.video = await setupCamera();
    this.video.play();
    async function setupCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser API navigator.mediaDevices.getUserMedia not available');
      }
      const videoElement = document.getElementById(videoId);
      videoElement.srcObject = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: 1080,
          height: 820,
          facingMode: 'user'
        },
      });
      return new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
          videoElement.width = videoElement.videoWidth;
          videoElement.height = videoElement.videoHeight;
          resolve(videoElement);
        };
      });
    }
  }
}
