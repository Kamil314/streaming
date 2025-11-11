// API service for Firebase Functions
import { firebaseConfig } from './firebase-config.js';

/**
 * Get the base URL for Firebase Functions
 */
export const getFunctionBaseUrl = () => {
  const projectId = firebaseConfig.projectId;
  const region = 'europe-west1';
  return `https://${region}-${projectId}.cloudfunctions.net`;
};

/**
 * List all uploaded videos
 * @returns {Promise<Array>} Array of video objects
 */
export const listVideos = async () => {
  const baseUrl = getFunctionBaseUrl();
  const response = await fetch(`${baseUrl}/listVideos`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to load videos');
  }

  const result = await response.json();
  return result.videos || [];
};

