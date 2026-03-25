// upload.js — uploads VTT subtitle files to YouTube videos
// Usage: node upload.js <episode-id> <youtube-video-id>
// Example: node upload.js sample-ep-001 dQw4w9WgXcQ

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CLIENT_SECRET_FILE = 'client_secret.json';
const TOKEN_FILE = 'token.json';
const DATA_DIR = 'data';

// Maps file suffix to YouTube caption language code and track name
const TRACK_INFO = {
  'en-en': { language: 'en', name: 'English captions' },
  'en-ko': { language: 'ko', name: '한국어 번역 자막' },
  'ko-en': { language: 'en', name: 'English (translated from Korean)' },
  'ko-ko': { language: 'ko', name: '한국어 받아쓰기' },
};

// ── auth ─────────────────────────────────────────────────────────────────────

function getAuthClient() {
  if (!fs.existsSync(CLIENT_SECRET_FILE)) {
    console.error(`ERROR: ${CLIENT_SECRET_FILE} not found. See README for setup instructions.`);
    process.exit(1);
  }
  if (!fs.existsSync(TOKEN_FILE)) {
    console.error(`ERROR: ${TOKEN_FILE} not found. Run "node auth.js" first.`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(CLIENT_SECRET_FILE));
  const creds = raw.installed || raw.web;
  const oauth2Client = new google.auth.OAuth2(creds.client_id, creds.client_secret);
  oauth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_FILE)));
  return oauth2Client;
}

// ── upload ────────────────────────────────────────────────────────────────────

async function getExistingCaptions(youtube, videoId) {
  const response = await youtube.captions.list({ part: ['snippet'], videoId });
  return response.data.items || [];
}

async function uploadCaption(youtube, videoId, existingCaptions, filePath, language, name) {
  console.log(`  Uploading "${name}" (${language}) from ${path.basename(filePath)}...`);

  const existing = existingCaptions.find(c => c.snippet.name === name);
  if (existing) {
    console.log(`    Track already exists — deleting and replacing...`);
    await youtube.captions.delete({ id: existing.id });
  }

  await youtube.captions.insert({
    part: ['snippet'],
    requestBody: {
      snippet: {
        videoId,
        language,
        name,
        isDraft: false,
      },
    },
    media: {
      mimeType: 'text/vtt',
      body: fs.createReadStream(filePath),
    },
  });

  console.log(`  ✓ Done`);
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const [episodeId, videoId] = process.argv.slice(2);

  if (!episodeId || !videoId) {
    console.error('Usage: node upload.js <episode-id> <youtube-video-id>');
    console.error('Example: node upload.js sample-ep-001 dQw4w9WgXcQ');
    process.exit(1);
  }

  const auth = getAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });

  // Find all matching VTT files for this episode
  const tracks = Object.entries(TRACK_INFO).map(([suffix, info]) => {
    const filePath = path.join(DATA_DIR, `${episodeId}.${suffix}.vtt`);
    return { filePath, ...info };
  });

  const missing = tracks.filter(t => !fs.existsSync(t.filePath));
  if (missing.length > 0) {
    console.error(`\nERROR: Missing files:`);
    missing.forEach(t => console.error(`  ${t.filePath}`));
    process.exit(1);
  }

  console.log(`\nUploading subtitles for episode "${episodeId}" to video ${videoId}...\n`);

  const existingCaptions = await getExistingCaptions(youtube, videoId);

  for (const track of tracks) {
    await uploadCaption(youtube, videoId, existingCaptions, track.filePath, track.language, track.name);
  }

  console.log(`\nAll done!\n`);
}

main().catch((err) => {
  console.error('\nSomething went wrong:', err.message);
  process.exit(1);
});
