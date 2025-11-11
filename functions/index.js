const functions = require('firebase-functions');
const admin = require('firebase-admin');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path');
const os = require('os');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);
admin.initializeApp();

const storage = admin.storage();
const HLS_SEGMENT_TIME = 10;
const MAX_TIMEOUT = 540;
const MEMORY = '4GB';
const REGION = 'europe-west1';

// Helper: Enable CORS
const enableCORS = (res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
};

// Helper: Handle OPTIONS request
const handleOptions = (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
};

// Helper: Convert video to HLS
const convertToHLS = async (inputPath, outputDir) => {
  const playlistName = 'playlist.m3u8';
  const outputPath = path.join(outputDir, playlistName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        `-hls_time ${HLS_SEGMENT_TIME}`,
        '-hls_list_size 0',
        '-hls_segment_filename', path.join(outputDir, '%03d.ts'),
        '-f hls'
      ])
      .output(outputPath)
      .on('end', () => resolve(outputDir))
      .on('error', reject)
      .run();
  });
};

// Helper: Upload file to Storage
const uploadToStorage = async (filePath, destination, contentType) => {
  const bucket = storage.bucket();
  await bucket.upload(filePath, {
    destination,
    metadata: { contentType }
  });
  return bucket.file(destination);
};

// Helper: Download file from Storage
const downloadFromStorage = async (filePath, localPath) => {
  const bucket = storage.bucket();
  const file = bucket.file(filePath);
  await file.download({ destination: localPath });
  return localPath;
};

// Helper: Get public URL (no signing required)
const getPublicUrl = async (file) => {
  // Construct public URL directly
  // Files in videos/ folder are publicly readable via storage rules
  const bucketName = file.bucket.name;
  const fileName = encodeURIComponent(file.name).replace(/'/g, '%27');
  return `https://storage.googleapis.com/${bucketName}/${fileName}`;
};

/**
 * Storage trigger: Automatically process videos when uploaded to uploads/ folder
 */
exports.processVideoOnUpload = functions
  .region(REGION)
  .runWith({
    timeoutSeconds: MAX_TIMEOUT,
    memory: MEMORY
  })
  .storage.object()
  .onFinalize(async (object) => {
    const filePath = object.name;
    const contentType = object.contentType;

    // Only process video files in uploads/ folder
    if (!filePath.startsWith('uploads/') || !contentType?.startsWith('video/')) {
      console.log('Skipping non-video file or file outside uploads/ folder:', filePath);
      return;
    }

    // Skip if already processed (in videos/ folder)
    if (filePath.startsWith('videos/')) {
      return;
    }

    console.log('Processing video:', filePath);

    try {
      const bucket = storage.bucket();
      const videoFile = bucket.file(filePath);

      // Download video
      const tempInputPath = path.join(os.tmpdir(), `input_${Date.now()}_${path.basename(filePath)}`);
      await videoFile.download({ destination: tempInputPath });

      // Convert to HLS
      const outputDir = path.join(os.tmpdir(), `hls_${Date.now()}`);
      await convertToHLS(tempInputPath, outputDir);

      // Upload HLS files
      const videoId = `video_${Date.now()}`;
      const hlsFolder = `videos/${videoId}`;

      // Upload playlist
      const playlistFile = await uploadToStorage(
        path.join(outputDir, 'playlist.m3u8'),
        `${hlsFolder}/playlist.m3u8`,
        'application/vnd.apple.mpegurl'
      );

      // Upload segments
      const segmentFiles = fs.readdirSync(outputDir)
        .filter(f => f.endsWith('.ts'));

      for (const segmentFile of segmentFiles) {
        await uploadToStorage(
          path.join(outputDir, segmentFile),
          `${hlsFolder}/${segmentFile}`,
          'video/mp2t'
        );
      }

      // Get playlist URL (public)
      const playlistUrl = await getPublicUrl(playlistFile);

      // Store metadata
      const videoData = {
        id: videoId,
        name: path.basename(filePath),
        playlistUrl,
        originalPath: filePath,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        segments: segmentFiles.length,
        status: 'processed'
      };

      await admin.firestore()
        .collection('videos')
        .doc(videoId)
        .set(videoData);

      // Cleanup
      fs.unlinkSync(tempInputPath);
      fs.rmSync(outputDir, { recursive: true, force: true });

      console.log('Video processed successfully:', videoId);
    } catch (error) {
      console.error('Error processing video:', error);
      throw error;
    }
  });

/**
 * List all uploaded videos
 * GET /listVideos
 */
exports.listVideos = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    enableCORS(res);
    if (handleOptions(req, res)) return;

    try {
      const snapshot = await admin.firestore()
        .collection('videos')
        .get();

      const videos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by creation date (newest first)
      videos.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        }
        return 0;
      });

      res.status(200).json({
        success: true,
        videos,
        count: videos.length
      });
    } catch (error) {
      console.error('List error:', error);
      res.status(500).json({
        error: 'Failed to list videos',
        details: error.message
      });
    }
  });
