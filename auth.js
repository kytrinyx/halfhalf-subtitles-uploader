// auth.js — run this once to authenticate with YouTube
// Usage: node auth.js

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const CLIENT_SECRET_FILE = 'client_secret.json';
const TOKEN_FILE = 'token.json';
const SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl'];
const REDIRECT_PORT = 3000;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;

// ── helpers ──────────────────────────────────────────────────────────────────

function loadClientSecret() {
  if (!fs.existsSync(CLIENT_SECRET_FILE)) {
    console.error(`\nERROR: ${CLIENT_SECRET_FILE} not found.`);
    console.error('');
    console.error('To get it:');
    console.error('  1. Go to https://console.cloud.google.com/');
    console.error('  2. Create a project (or pick an existing one)');
    console.error('  3. Enable "YouTube Data API v3" under APIs & Services');
    console.error('  4. Go to APIs & Services → Credentials');
    console.error('  5. Create credentials → OAuth 2.0 Client ID → Desktop app');
    console.error(`  6. Download the JSON file and save it as ${CLIENT_SECRET_FILE} in this folder`);
    console.error('');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(CLIENT_SECRET_FILE));
  // The file can have an "installed" or "web" key depending on how it was downloaded
  const creds = raw.installed || raw.web;
  if (!creds) {
    console.error(`\nERROR: ${CLIENT_SECRET_FILE} doesn't look right. Make sure you downloaded the "Desktop app" credentials.`);
    process.exit(1);
  }
  return creds;
}

function openBrowser(authUrl) {
  const { exec } = require('child_process');
  // macOS: open, Linux: xdg-open, Windows: start
  const command =
    process.platform === 'darwin' ? `open "${authUrl}"` :
    process.platform === 'win32'  ? `start "" "${authUrl}"` :
                                    `xdg-open "${authUrl}"`;
  exec(command, (err) => {
    if (err) {
      console.log('\nCould not open browser automatically.');
      console.log('Please open this URL manually:\n');
      console.log('  ' + authUrl + '\n');
    }
  });
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (fs.existsSync(TOKEN_FILE)) {
    console.log(`\nYou're already authenticated! (${TOKEN_FILE} exists)`);
    console.log('Delete that file and run this again if you need to re-authenticate.\n');
    return;
  }

  const creds = loadClientSecret();
  const oauth2Client = new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret,
    REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // gives us a refresh token so we don't need to re-auth later
    scope: SCOPES,
  });

  console.log('\nOpening your browser to authenticate with YouTube...\n');
  openBrowser(authUrl);

  // Start a temporary local server to catch the OAuth redirect
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const { query } = url.parse(req.url, true);

      if (query.error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h2>Authentication cancelled or failed.</h2><p>You can close this tab.</p>');
        server.close();
        reject(new Error(`Auth error: ${query.error}`));
        return;
      }

      if (query.code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h2>Authentication successful!</h2><p>You can close this tab and return to the terminal.</p>');
        server.close();
        resolve(query.code);
      }
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(`Waiting for Google to redirect back (listening on port ${REDIRECT_PORT})...`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\nERROR: Port ${REDIRECT_PORT} is already in use.`);
        console.error('Close whatever is using that port and try again.\n');
      }
      reject(err);
    });
  });

  const { tokens } = await oauth2Client.getToken(code);
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));

  console.log('\nAuthentication successful!');
  console.log(`Credentials saved to ${TOKEN_FILE}`);
  console.log('\nYou can now run the upload script.\n');
}

main().catch((err) => {
  console.error('\nSomething went wrong:', err.message);
  process.exit(1);
});
