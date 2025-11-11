// Firebase Storage utilities
import { firebaseConfig } from './firebase-config.js';

// Dynamic import of Firebase SDK
let storage = null;

const initStorage = async () => {
  if (storage) return storage;
  
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
  const { getStorage, ref, uploadBytesResumable, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');
  
  const app = initializeApp(firebaseConfig);
  storage = { getStorage, ref, uploadBytesResumable, getDownloadURL, app };
  return storage;
};

/**
 * Upload video file to Firebase Storage
 * @param {File} file - Video file to upload
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object>} Upload result with path and URL
 */
export const uploadVideoToStorage = async (file, onProgress) => {
  const firebase = await initStorage();
  const storageInstance = firebase.getStorage(firebase.app);
  
  const videoId = `video_${Date.now()}`;
  const fileName = file.name || `${videoId}.mp4`;
  const storagePath = `uploads/${videoId}_${fileName}`;
  const storageRef = firebase.ref(storageInstance, storagePath);

  // Create upload task
  const uploadTask = firebase.uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Progress tracking
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        console.error('Upload error:', error);
        reject(error);
      },
      async () => {
        // Upload completed
        try {
          const firebase = await initStorage();
          const downloadURL = await firebase.getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            path: storagePath,
            url: downloadURL,
            videoId,
            fileName
          });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
};

