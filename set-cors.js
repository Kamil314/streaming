#!/usr/bin/env node

const https = require('https');

const projectId = 'kamil-streaming';
const url = `https://us-central1-${projectId}.cloudfunctions.net/setCors`;

console.log('Setting CORS configuration...');

const req = https.get(url, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ CORS configuration set successfully!');
      try {
        const result = JSON.parse(body);
        console.log(result.message || '');
      } catch (e) {
        console.log(body);
      }
    } else {
      console.error(`❌ Error: HTTP ${res.statusCode}`);
      console.error(body);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Error calling function:', err.message);
  console.error('\nMake sure the setCors function is deployed:');
  console.error('  firebase deploy --only functions:setCors');
  process.exit(1);
});

req.setTimeout(60000, () => {
  req.destroy();
  console.error('❌ Request timeout');
  process.exit(1);
});


