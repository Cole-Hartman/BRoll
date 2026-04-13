# BRoll

## Architecture

https://excalidraw.com/#json=PXPnfY80n7-ZLVb9EPO38,0Ha_E_YLLAq0eR0H31gqPg

## API Endpoints

### Transcription API (`/api-transcription`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check - returns OK if API is running |
| `POST` | `/transcribe` | Transcribe a video from Immich (caches result) |
| `GET` | `/transcription/{asset_id}` | Get existing transcription by Immich asset ID |
| `DELETE` | `/transcription/{asset_id}` | Delete a transcription to allow re-transcription |

#### POST /transcribe

Request body:
```json
{
  "assetId": "immich-asset-id",
  "videoUrl": "https://immich.example.com/api/assets/xxx/video",
  "apiKey": "your-immich-api-key"
}
```

Response:
```json
{
  "assetId": "immich-asset-id",
  "text": "Full transcription text...",
  "segments": [{"start": 0.0, "end": 2.5, "text": "..."}],
  "language": "en",
  "duration": 45.2
}
```

### Immich API (`/api`)

Proxied to Immich - see [Immich API docs](https://immich.app/docs/api).
