import type { Album, Asset, UploadResponse, ApiError } from './types';

class ImmichApi {
  private serverUrl: string = '';
  private apiKey: string = '';
  private useProxy: boolean = false;

  configure(serverUrl: string, apiKey: string) {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    // Use proxy in development when VITE_IMMICH_URL is set
    this.useProxy = import.meta.env.DEV && !!import.meta.env.VITE_IMMICH_URL;
  }

  isConfigured(): boolean {
    return Boolean(this.serverUrl && this.apiKey);
  }

  getServerUrl(): string {
    return this.serverUrl;
  }

  getApiKey(): string {
    return this.apiKey;
  }

  private getApiBase(): string {
    // In dev with proxy configured, use proxy path
    if (this.useProxy) {
      return '/immich-api';
    }
    return `${this.serverUrl}/api`;
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('API not configured');
    }

    const url = `${this.getApiBase()}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'x-api-key': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: response.statusText,
        statusCode: response.status,
      }));
      throw error;
    }

    return response.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      // Use /users/me to verify the API key is valid (requires auth)
      await this.fetch('/users/me');
      return true;
    } catch (err) {
      console.error('Connection test failed:', err);
      return false;
    }
  }

  async getAlbums(): Promise<Album[]> {
    return this.fetch<Album[]>('/albums');
  }

  async getAlbum(id: string): Promise<Album> {
    return this.fetch<Album>(`/albums/${id}`);
  }

  async addAssetsToAlbum(albumId: string, assetIds: string[]): Promise<void> {
    await this.fetch(`/albums/${albumId}/assets`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: assetIds }),
    });
  }

  async getAsset(id: string): Promise<Asset> {
    return this.fetch<Asset>(`/assets/${id}`);
  }

  getThumbnailUrl(assetId: string): string {
    const base = this.getApiBase();
    return `${base}/assets/${assetId}/thumbnail?apiKey=${this.apiKey}`;
  }

  getVideoUrl(assetId: string): string {
    const base = this.getApiBase();
    return `${base}/assets/${assetId}/video/playback?apiKey=${this.apiKey}`;
  }

  async uploadAsset(file: File, deviceAssetId?: string): Promise<UploadResponse> {
    if (!this.isConfigured()) {
      throw new Error('API not configured');
    }

    const formData = new FormData();
    formData.append('assetData', file);
    formData.append('deviceAssetId', deviceAssetId || `broll-${Date.now()}`);
    formData.append('deviceId', 'broll-web');
    formData.append('fileCreatedAt', new Date().toISOString());
    formData.append('fileModifiedAt', new Date().toISOString());

    const response = await fetch(`${this.getApiBase()}/assets`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: response.statusText,
        statusCode: response.status,
      }));
      throw error;
    }

    return response.json();
  }
}

export const immichApi = new ImmichApi();
