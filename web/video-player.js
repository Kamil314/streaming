// Video player functionality with HLS.js support

/**
 * Initialize HLS.js player for a video element
 * @param {HTMLVideoElement} videoElement - Video element to initialize
 */
export const initializeHLSPlayer = (videoElement) => {
  const source = videoElement.querySelector('source');
  if (!source) return;

  const videoSrc = source.src;

  // Check if HLS.js is available and needed
  if (typeof Hls !== 'undefined' && Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(videoSrc);
    hls.attachMedia(videoElement);
    
    // Handle errors
    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error('Fatal network error, trying to recover...');
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error('Fatal media error, trying to recover...');
            hls.recoverMediaError();
            break;
          default:
            console.error('Fatal error, cannot recover');
            hls.destroy();
            break;
        }
      }
    });
  } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
    // Native HLS support (Safari)
    videoElement.src = videoSrc;
  } else {
    console.warn('HLS is not supported in this browser');
  }
};

