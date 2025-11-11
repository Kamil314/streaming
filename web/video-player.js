// Video player functionality with HLS.js support

// Store HLS instances for cleanup
const hlsInstances = new WeakMap();

/**
 * Clean up HLS instance for a video element
 * @param {HTMLVideoElement} videoElement - Video element to clean up
 */
export const cleanupHLSPlayer = (videoElement) => {
  const hls = hlsInstances.get(videoElement);
  if (hls) {
    hls.destroy();
    hlsInstances.delete(videoElement);
  }
};

/**
 * Initialize HLS.js player for a video element
 * @param {HTMLVideoElement} videoElement - Video element to initialize
 */
export const initializeHLSPlayer = (videoElement) => {
  // Clean up any existing HLS instance
  cleanupHLSPlayer(videoElement);

  const source = videoElement.querySelector('source');
  if (!source) {
    console.warn('No source element found for video');
    return;
  }

  const videoSrc = source.src;
  if (!videoSrc) {
    console.warn('No video source URL found');
    return;
  }

  // Add loading indicator
  const videoCard = videoElement.closest('.video-card');
  let loadingIndicator = null;
  if (videoCard) {
    loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'video-loading';
    loadingIndicator.textContent = 'Loading video...';
    loadingIndicator.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10;
    `;
    const videoContainer = videoElement.parentElement;
    if (videoContainer) {
      videoContainer.style.position = 'relative';
      videoContainer.appendChild(loadingIndicator);
    }
  }

  const removeLoadingIndicator = () => {
    if (loadingIndicator && loadingIndicator.parentElement) {
      loadingIndicator.remove();
    }
  };

  // Add error display
  const showError = (message) => {
    removeLoadingIndicator();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'video-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(220, 53, 69, 0.9);
      color: white;
      padding: 15px 20px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10;
      text-align: center;
      max-width: 90%;
    `;
    const videoContainer = videoElement.parentElement;
    if (videoContainer) {
      videoContainer.style.position = 'relative';
      videoContainer.appendChild(errorDiv);
    }
  };

  // Check if HLS.js is available and needed
  if (typeof Hls !== 'undefined' && Hls.isSupported()) {
    // Extract base URL from playlist URL (without query params) for proper segment resolution
    const playlistUrlWithoutQuery = videoSrc.split('?')[0];
    const baseUrl = playlistUrlWithoutQuery.substring(0, playlistUrlWithoutQuery.lastIndexOf('/') + 1);
    
    // Helper function to fix fragment URLs to use the correct base path
    const fixFragmentUrl = (url) => {
      if (!url) return url;
      
      // If it's already a correct absolute URL with the base path, return as is
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      // If it's an absolute URL but missing the path
      if (url.includes('://')) {
        try {
          const urlObj = new URL(url);
          const baseUrlObj = new URL(baseUrl);
          // Same origin but different path - extract filename and use base path
          if (urlObj.origin === baseUrlObj.origin) {
            const filename = url.substring(url.lastIndexOf('/') + 1);
            return baseUrl + filename;
          }
        } catch (e) {
          // Invalid URL format, treat as relative
        }
      }
      
      // If URL is missing protocol (e.g., "domain.com/000.ts")
      if (url.includes('/') && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
        // Try to extract the filename and use base URL
        const filename = url.substring(url.lastIndexOf('/') + 1);
        if (filename && filename.endsWith('.ts')) {
          return baseUrl + filename;
        }
      }
      
      // Relative URL (e.g., "000.ts" or "/000.ts")
      const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
      return baseUrl + cleanUrl;
    };
    
    // Create custom loader to intercept and fix URLs at the loader level
    class CustomLoader extends Hls.DefaultConfig.loader {
      constructor(config) {
        super(config);
        this.baseUrl = baseUrl;
      }
      
      load(context, config, callbacks) {
        // Fix the URL before loading
        if (context.url) {
          context.url = fixFragmentUrl(context.url);
        }
        // Call parent loader
        return super.load(context, config, callbacks);
      }
    }
    
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 90,
      loader: CustomLoader
    });
    
    hlsInstances.set(videoElement, hls);
    
    // Intercept manifest parsing to fix fragment URLs to use the correct base path
    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      // Fix all fragment URLs to ensure they use the correct base URL
      if (data.levels && data.levels.length > 0) {
        data.levels.forEach(level => {
          if (level.details && level.details.fragments) {
            level.details.fragments.forEach(fragment => {
              if (fragment.url) {
                fragment.url = fixFragmentUrl(fragment.url);
              }
            });
          }
        });
      }
      
      removeLoadingIndicator();
      console.log('HLS manifest parsed successfully');
    });
    
    // Also intercept fragment loading as a fallback to fix URLs before they're requested
    hls.on(Hls.Events.FRAG_LOADING, (event, data) => {
      if (data.frag && data.frag.url) {
        data.frag.url = fixFragmentUrl(data.frag.url);
      }
    });
    
    // Load playlist with cache bust parameter
    hls.loadSource(videoSrc);
    hls.attachMedia(videoElement);

    // Handle loading progress
    hls.on(Hls.Events.FRAG_LOADING, () => {
      // Keep loading indicator visible
    });

    // Handle errors
    hls.on(Hls.Events.ERROR, (event, data) => {
      console.error('HLS error:', data);
      
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error('Fatal network error, trying to recover...');
            try {
              hls.startLoad();
            } catch (e) {
              showError('Network error. Please check your connection and try again.');
              hls.destroy();
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error('Fatal media error, trying to recover...');
            try {
              hls.recoverMediaError();
            } catch (e) {
              showError('Video playback error. The video may be corrupted or incompatible.');
              hls.destroy();
            }
            break;
          default:
            console.error('Fatal error, cannot recover');
            showError('Video playback failed. Please try refreshing the page.');
            hls.destroy();
            break;
        }
      } else {
        // Non-fatal error, log but continue
        console.warn('Non-fatal HLS error:', data);
      }
    });

    // Handle video element errors
    videoElement.addEventListener('error', (e) => {
      console.error('Video element error:', e);
      const error = videoElement.error;
      if (error) {
        let errorMessage = 'Video playback error.';
        switch (error.code) {
          case error.MEDIA_ERR_ABORTED:
            errorMessage = 'Video playback was aborted.';
            break;
          case error.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error while loading video.';
            break;
          case error.MEDIA_ERR_DECODE:
            errorMessage = 'Video decoding error.';
            break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Video format not supported.';
            break;
        }
        showError(errorMessage);
      }
    });

    // Remove loading indicator when video can play
    videoElement.addEventListener('canplay', removeLoadingIndicator);
    videoElement.addEventListener('loadeddata', removeLoadingIndicator);
    
  } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
    // Native HLS support (Safari)
    videoElement.src = videoSrc;
    
    videoElement.addEventListener('loadstart', () => {
      // Loading started
    });
    
    videoElement.addEventListener('canplay', removeLoadingIndicator);
    videoElement.addEventListener('loadeddata', removeLoadingIndicator);
    
    videoElement.addEventListener('error', (e) => {
      console.error('Video element error:', e);
      showError('Video playback error. Please try refreshing the page.');
    });
  } else {
    console.warn('HLS is not supported in this browser');
    showError('HLS video playback is not supported in this browser.');
  }
};

