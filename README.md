# Youtube {KO,EN} Transcript and Subtitle Uploader

A Node.js script for uploading VTT subtitle files to YouTube videos.

## Requirements

- [Node.js](https://nodejs.org/) (v18 or later)
- A Google account with access to the YouTube channel

## Setup

### 1. Install dependencies

```
npm install
```

### 2. Get YouTube API credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. In the left sidebar, click **APIs & Services**, then click **+ Enable APIs and Services** at the top
4. Search for **YouTube Data API v3**, click on it, then click **Enable**
5. In the left sidebar, click **APIs & Services → Credentials**
6. Click **Create credentials** at the top, then choose **OAuth client ID**
7. If prompted to set up the Google Auth Platform first:
   - You'll land on a **Branding** page saying "Google Auth Platform not configured yet"
   - Click **Get started**
   - Fill in an app name (anything, e.g. "Subtitle Uploader") and your email address
   - For **Audience**, choose **External** (Internal is only for Google Workspace accounts — External is fine, it just means you need to add yourself as a test user in the next step)
   - For **Contact information**, enter your email address
   - Agree to the terms and click **Create**
   - In the left sidebar, click **Audience**, scroll down to **Test users**, and add your own Google account email
   - You'll land on an OAuth overview screen — click the **Create OAuth Client** button
8. Choose **Desktop app** as the application type, give it any name, and click **Create**
9. A popup appears saying "OAuth Client Created" with a warning that the secret will never be shown again — click **Download JSON** before closing it
10. The file downloads with a long auto-generated name — rename it to `client_secret.json`
11. Move `client_secret.json` into this folder (the same folder as `auth.js`)

### 3. Authenticate

```
node auth.js
```

This opens your browser. Log in with your Google account, grant access, and return to the terminal. Your credentials are saved to `token.json` — you only need to do this once.

## Usage

```
node upload.js <episode-id> <youtube-video-id>
```

For example:

```
node upload.js sample-ep-001 dQw4w9WgXcQ
```

The episode ID is the filename prefix of the VTT files in the `data/` folder. The YouTube video ID is the part after `?v=` in the video's URL.

The script will upload four subtitle tracks to the video:

| File | Language | Track name |
|------|----------|------------|
| `<episode-id>.en-en.vtt` | English | English captions |
| `<episode-id>.en-ko.vtt` | Korean | 한국어 번역 자막 |
| `<episode-id>.ko-en.vtt` | English | English (translated from Korean) |
| `<episode-id>.ko-ko.vtt` | Korean | 한국어 받아쓰기 |

## Files

| File | Purpose |
|------|---------|
| `client_secret.json` | Your API credentials (download from Google Cloud Console) |
| `token.json` | Your saved login token (created by `node auth.js`) |

> **Note:** Keep `client_secret.json` and `token.json` private. Do not share them or commit them to version control.
