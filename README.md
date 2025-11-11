# Firebase Video Streaming POC

A proof-of-concept Firebase Functions project that allows uploading videos, converting them to HLS format, and streaming them.

## Features

- Upload videos via HTTP endpoint
- Automatic HLS conversion using FFmpeg
- Store HLS segments in Firebase Storage
- List all uploaded videos
- Stream videos using HLS protocol

## Quick Start

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Update project ID** in `.firebaserc` with your Firebase project ID

4. **Install and deploy**:
   ```bash
   npm run setup    # Install dependencies
   npm run deploy   # Deploy functions
   ```

   Available scripts:
   - `npm run setup` - Install function dependencies
   - `npm run deploy` - Deploy functions only
   - `npm run deploy:hosting` - Deploy web app (hosting) only
   - `npm run deploy:all` - Deploy everything (functions, hosting, rules, etc.)
   - `npm run serve` - Run local emulator (functions + hosting)
   - `npm run serve:functions` - Run functions emulator only
   - `npm run logs` - View function logs

## API Endpoints

### Upload Video
```
POST https://europe-west1-YOUR_PROJECT.cloudfunctions.net/uploadVideo
Content-Type: multipart/form-data

Form field: video (file)
```

**Note:** Functions are deployed to `europe-west1` region (Belgium). To use a different European region, update the `REGION` constant in `functions/index.js`. Available European regions:
- `europe-west1` (Belgium) - Default
- `europe-west2` (London)
- `europe-west3` (Frankfurt)
- `europe-west4` (Netherlands)
- `europe-west6` (Zurich)
- `europe-central2` (Warsaw)

**Response:**
```json
{
  "success": true,
  "video": {
    "id": "video_1234567890",
    "name": "my-video.mp4",
    "playlistUrl": "https://...",
    "createdAt": "...",
    "segments": 10
  },
  "playlistUrl": "https://..."
}
```

### List Videos
```
GET https://europe-west1-YOUR_PROJECT.cloudfunctions.net/listVideos
```

**Response:**
```json
{
  "success": true,
  "videos": [
    {
      "id": "video_1234567890",
      "name": "my-video.mp4",
      "playlistUrl": "https://...",
      "createdAt": "...",
      "segments": 10
    }
  ],
  "count": 1
}
```

## Usage Example

### Upload a video using curl:
```bash
curl -X POST \
  https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/uploadVideo \
  -F "video=@/path/to/your/video.mp4"
```

### Stream video in HTML:
```html
<video controls>
  <source src="PLAYLIST_URL_FROM_RESPONSE" type="application/x-mpegURL">
</video>
```

Or use HLS.js for better browser support:
```html
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<video id="video" controls></video>
<script>
  const video = document.getElementById('video');
  const videoSrc = 'PLAYLIST_URL_FROM_RESPONSE';
  
  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(videoSrc);
    hls.attachMedia(video);
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = videoSrc;
  }
</script>
```

## Important Notes

### Firebase Functions Configuration

For video processing, you may need to increase the function timeout and memory:

1. Update `functions/index.js` to use higher memory/timeout:
   ```javascript
   exports.uploadVideo = functions
     .runWith({
       timeoutSeconds: 540, // 9 minutes (max)
       memory: '1GB' // or '2GB' for larger videos
     })
     .https.onRequest(async (req, res) => {
       // ... existing code
     });
   ```

2. FFmpeg is included via `@ffmpeg-installer/ffmpeg` package, which provides the binary automatically.

## Testing

### Option 1: Deployed Web App (Recommended)
1. Deploy hosting: `npm run deploy:hosting`
2. Visit your Firebase Hosting URL (shown after deployment)
3. Enter your Firebase Function base URL
4. Upload and stream videos

### Option 2: Local Development
1. Run emulator: `npm run serve`
2. Open `http://localhost:5000` (or the URL shown in terminal)
3. Enter your Firebase Function base URL
4. Upload and stream videos

### Option 3: Direct HTML File
1. Open `web/index.html` in a browser
2. Enter your Firebase Function base URL (e.g., `https://europe-west1-your-project.cloudfunctions.net`)
3. Upload a video and wait for processing
4. View the list of uploaded videos and stream them

### Notes

- Videos are converted to HLS with 10-second segments
- HLS files are stored in `videos/{videoId}/` in Firebase Storage
- Video metadata is stored in Firestore `videos` collection
- This is a POC - for production, consider:
  - Adding authentication
  - Better error handling
  - Progress tracking for uploads
  - Video optimization/compression
  - CDN integration for better performance
  - Rate limiting

