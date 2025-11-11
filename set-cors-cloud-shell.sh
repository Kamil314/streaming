#!/bin/bash
# Command to run in Google Cloud Shell to set CORS

PROJECT_ID="kamil-streaming"
BUCKET_NAME="${PROJECT_ID}.firebasestorage.app"

# Create CORS config inline
cat > /tmp/cors-config.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "OPTIONS", "PUT", "POST"],
    "responseHeader": ["Content-Type", "Content-Length", "Content-Range", "Range", "Accept-Ranges"],
    "maxAgeSeconds": 3600
  }
]
EOF

# Set CORS configuration
gcloud storage buckets update gs://${BUCKET_NAME} --cors-file=/tmp/cors-config.json

echo "✅ CORS configuration set for ${BUCKET_NAME}"

