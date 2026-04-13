import type { TranscriptionResult } from './types';

const API_BASE = '/api-transcription';

export const transcriptionApi = {
  async transcribe(
    assetId: string,
    videoUrl: string,
    apiKey: string
  ): Promise<TranscriptionResult> {
    const response = await fetch(`${API_BASE}/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assetId,
        videoUrl,
        apiKey,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: response.statusText,
      }));
      throw new Error(error.detail || 'Transcription failed');
    }

    return response.json();
  },

  async getTranscription(assetId: string): Promise<TranscriptionResult | null> {
    const response = await fetch(`${API_BASE}/transcription/${assetId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: response.statusText,
      }));
      throw new Error(error.detail || 'Failed to fetch transcription');
    }

    return response.json();
  },

  async deleteTranscription(assetId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/transcription/${assetId}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 404) {
      const error = await response.json().catch(() => ({
        detail: response.statusText,
      }));
      throw new Error(error.detail || 'Failed to delete transcription');
    }
  },
};
