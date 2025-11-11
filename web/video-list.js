// Video list functionality
import { listVideos } from './api.js';
import { showStatus } from './ui.js';
import { initializeHLSPlayer } from './video-player.js';

/**
 * Render video cards in the grid
 * @param {Array} videos - Array of video objects
 * @param {HTMLElement} container - Container element for video cards
 */
const renderVideoCards = (videos, container) => {
  if (videos.length === 0) {
    container.innerHTML = '<div class="empty-state">No videos found. Upload a video to get started!</div>';
    return;
  }

  container.innerHTML = videos.map(video => `
    <div class="video-card">
      <div class="video-card-header">
        <h3>${video.name || video.id}</h3>
        <small>${video.segments || 0} segments</small>
      </div>
      <video controls preload="metadata">
        <source src="${video.playlistUrl}" type="application/x-mpegURL">
      </video>
      <div class="video-card-footer">
        <a href="${video.playlistUrl}" target="_blank">Open playlist</a>
      </div>
    </div>
  `).join('');

  // Initialize HLS.js for all video elements
  container.querySelectorAll('video').forEach(video => {
    initializeHLSPlayer(video);
  });
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

