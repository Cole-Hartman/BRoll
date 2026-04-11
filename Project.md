# Immich Video Journal (BRoll) — Requirements Document

## Overview

A browser-based frontend for Immich that serves as a personal video journal platform. Users can browse, watch, and record video journal entries, with all videos stored in and served from their self-hosted Immich instance.

---

## 1. Connection & Authentication

- User can enter their Immich server URL and API key via a settings screen
- Credentials are persisted in `localStorage` so they survive page refreshes
- All API requests include the API key via the `x-api-key` header
- If credentials are missing or invalid, the app redirects to the settings screen with a clear error message
- User can update or clear credentials at any time from settings

---

## 2. Browse / Home View

- Fetches all albums that begin with 'JOURNAL' 
- Displays albums as horizontal rows, each labeled with the album name
- Each row shows a horizontally scrollable strip of video cards
- Only assets where `type === "VIDEO"` are shown — photos are filtered out
- Each video card displays:
  - Thumbnail fetched from `GET /assets/:id/thumbnail`
  - Video title (filename or description if available)
  - Date recorded
  - Duration (if available from asset metadata)

---

## 3. Album View

- Clicking an album opens a full grid view of all its videos
- Videos sorted by date descending (newest first) by default
- User can toggle sort order (newest / oldest)
- Same video card format as the home view

---

## 4. Video Player View

- Clicking a video card opens the player
- Playback uses a native `<video>` element pointed at `GET /assets/:id/video/playback`
- The API key is passed as a query parameter on the stream URL for auth
- Player supports:
  - Play / pause
  - Seek (via HTTP range requests — no full download required)
  - Volume control
  - Fullscreen
- Metadata displayed below the player:
  - Title
  - Date recorded
  - Album name
  - Description (if present)
- Back button returns to the previous album or home view

---

## 5. Video Recorder — Camera Mode

- User can open a recorder to create a new journal entry
- `getUserMedia({ video: true, audio: true })` prompts for camera and microphone access
- Live preview shown in a `<video>` element while recording
- Controls:
  - Start recording
  - Pause / resume
  - Stop and review
  - Discard and re-record
- After stopping, user can preview the recorded clip before submitting
- User fills in optional metadata before upload:
  - Title / description
  - Target album (selected from their existing Immich albums)

---

## 6. Video Recorder — Screen Mode
- Another section that lets you record new videos.
- Once done recording, you can upload to immich to the album of your choice.

---

## 8. Visual Design

- Dark, cinematic aesthetic — moody and film-journal in feel
- No generic AI design patterns (no purple gradients, no Inter font, no cookie-cutter layouts)
- Distinctive typography pairing: expressive display font + refined body font
- Smooth transitions between views
- Responsive — works on desktop and tablet

---

## 9. Technical Constraints

- Single-page app — no backend required, runs entirely in the browser
- All Immich API calls made directly from the browser (requires Immich to be network-accessible from the client)
- Video playback via native `<video>` — no transcoding, no video.js or HLS
- Recorded video output format: `webm/vp9` (Chrome) or `mp4/h264` (Safari) — both stored as-is in Immich
- Credentials stored in `localStorage` only — never sent anywhere except the user's own Immich server

