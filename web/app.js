// Main application entry point
import { initUploadForm } from './video-upload.js';
import { initVideoList } from './video-list.js';

/**
 * Initialize the application
 */
const initApp = () => {
  // Initialize upload form
  initUploadForm();
  
  // Initialize video list
  initVideoList();
};

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

