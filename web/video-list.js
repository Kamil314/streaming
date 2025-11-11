// Video list functionality
import { listVideos } from './api.js';
import { showStatus } from './ui.js';
import { initializeHLSPlayer, cleanupHLSPlayer } from './video-player.js';

/**
 * Render video cards in the grid
 * @param {Array} videos - Array of video objects
 * @param {HTMLElement} container - Container element for video cards
 */
const renderVideoCards = (videos, container) => {
  // Clean up existing HLS instances before re-rendering
  container.querySelectorAll('video').forEach(video => {
    cleanupHLSPlayer(video);
  });

  if (videos.length === 0) {
    container.innerHTML = '<div class="empty-state">No videos found. Upload a video to get started!</div>';
    return;
  }

  // Add cache busting to playlist URLs
  const addCacheBust = (url) => {
    const separator = url.includes('?') ? '&' : '?';
    // Use random value for cache busting
    const randomValue = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return `${url}${separator}_cb=${randomValue}`;
  };

  container.innerHTML = videos.map(video => {
    const playlistUrlWithCacheBust = addCacheBust(video.playlistUrl);
    return `
    <div class="video-card">
      <div class="video-card-header">
        <h3>${escapeHtml(video.name || video.id)}</h3>
        <small>${video.segments || 0} segments</small>
      </div>
      <div style="position: relative; background: #000;">
        <video controls preload="metadata" style="width: 100%; display: block;">
          <source src="${escapeHtml(playlistUrlWithCacheBust)}" type="application/x-mpegURL">
          Your browser does not support the video tag.
        </video>
      </div>
      <div class="video-card-footer">
        <a href="${escapeHtml(video.playlistUrl)}" target="_blank">Open playlist</a>
      </div>
    </div>
  `;
  }).join('');

  // Initialize HLS.js for all video elements after a short delay to ensure DOM is ready
  // and HLS.js library is loaded
  const initPlayers = () => {
    if (typeof Hls === 'undefined') {
      // Wait a bit more if HLS.js isn't loaded yet
      setTimeout(initPlayers, 100);
      return;
    }

    container.querySelectorAll('video').forEach((video, index) => {
      // Small delay between initializations to avoid overwhelming the browser
      setTimeout(() => {
        initializeHLSPlayer(video);
      }, index * 50);
    });
  };

  // Start initialization after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayers);
  } else {
    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      setTimeout(initPlayers, 0);
    });
  }
};

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Load and display videos
 */
export const loadVideos = async () => {
  const videoListDiv = document.getElementById('videoList');
  videoListDiv.innerHTML = '<div class="empty-state">Loading videos...</div>';

  try {
    const videos = await listVideos();
    renderVideoCards(videos, videoListDiv);
  } catch (error) {
    videoListDiv.innerHTML = `<div class="empty-state status error">Error loading videos: ${error.message}</div>`;
  }
};

/**
 * Initialize video list
 */
export const initVideoList = () => {
  const refreshBtn = document.querySelector('.section:last-of-type .btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadVideos);
  }
  
  // Load videos on initialization
  loadVideos();
};

