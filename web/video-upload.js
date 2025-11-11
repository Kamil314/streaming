// Video upload functionality
import { uploadVideoToStorage } from './firebase-storage.js';
import { showStatus } from './ui.js';
import { loadVideos } from './video-list.js';

/**
 * Handle video file upload
 * @param {File} file - Video file to upload
 * @param {HTMLElement} statusDiv - Element to show status messages
 * @param {HTMLElement} uploadBtn - Upload button element
 * @param {HTMLElement} fileInput - File input element
 */
export const handleVideoUpload = async (file, statusDiv, uploadBtn, fileInput) => {
  if (!file) {
    showStatus(statusDiv, 'Please select a video file', 'error');
    return;
  }

  uploadBtn.disabled = true;

  try {
    // Upload to Storage - processing will happen automatically via trigger
    showStatus(statusDiv, '⏳ Uploading video to storage...', 'loading');
    
    await uploadVideoToStorage(file, (progress) => {
      showStatus(statusDiv, `⏳ Uploading: ${Math.round(progress)}%`, 'loading');
    });

    // Upload complete - processing will happen automatically in background
    showStatus(statusDiv, '✅ Video uploaded! Processing will start automatically...', 'success');
    fileInput.value = '';
    
    // Refresh video list after a delay to check for processed video
    setTimeout(() => loadVideos(), 10000);
  } catch (error) {
    showStatus(statusDiv, `❌ Error: ${error.message}`, 'error');
  } finally {
    uploadBtn.disabled = false;
  }
};

/**
 * Initialize upload form handlers
 */
export const initUploadForm = () => {
  const fileInput = document.getElementById('videoFile');
  const uploadBtn = document.getElementById('uploadBtn');
  const statusDiv = document.getElementById('uploadStatus');

  uploadBtn.addEventListener('click', () => {
    const file = fileInput.files?.[0];
    handleVideoUpload(file, statusDiv, uploadBtn, fileInput);
  });
};

