import type { Album, Asset, UploadResponse, ApiError } from './types';

class ImmichApi {
	private serverUrl: string = '';
	private apiKey: string = '';

	configure(serverUrl: string, apiKey: string) {
		this.serverUrl = serverUrl.replace(/\/$/, '');
		this.apiKey = apiKey;
		// Use proxy in development when VITE_IMMICH_URL is set
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
		if (import.meta.env.DEV && !!import.meta.env.VITE_IMMICH_URL) {
			return '/immich-api';
		}
		return '/api';
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

	async removeAssetsFromAlbum(albumId: string, assetIds: string[]): Promise<void> {
		await this.fetch(`/albums/${albumId}/assets`, {
			method: 'DELETE',
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

	async uploadAsset(file: File, description?: string): Promise<UploadResponse> {
		if (!this.isConfigured()) {
			throw new Error('API not configured');
		}

		const formData = new FormData();
		formData.append('assetData', file);
		formData.append('deviceAssetId', `broll-${Date.now()}`);
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

		const result: UploadResponse = await response.json();

		// Do not update metadata on duplicate responses (often trashed assets we should not touch)
		if (description && !isImmichDuplicateUpload(result)) {
			await this.updateAsset(result.id, { description });
		}

		return result;
	}

	async updateAsset(assetId: string, data: { description?: string }): Promise<void> {
		if (!this.isConfigured()) {
			throw new Error('API not configured');
		}

		const response = await fetch(`${this.getApiBase()}/assets/${assetId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': this.apiKey,
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const error: ApiError = await response.json().catch(() => ({
				message: response.statusText,
				statusCode: response.status,
			}));
			throw error;
		}
	}

	/**
	 * Move the asset to Immich trash (soft delete). Use Immich to restore or empty trash later.
	 * `force: false` — see https://api.immich.app/endpoints/assets/deleteAssets
	 */
	async trashAsset(assetId: string): Promise<void> {
		if (!this.isConfigured()) {
			throw new Error('API not configured');
		}

		const response = await fetch(`${this.getApiBase()}/assets`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': this.apiKey,
			},
			body: JSON.stringify({ ids: [assetId], force: false }),
		});

		if (!response.ok) {
			const error: ApiError = await response.json().catch(() => ({
				message: response.statusText,
				statusCode: response.status,
			}));
			throw error;
		}
	}
}

export function isImmichDuplicateUpload(result: UploadResponse): boolean {
	return result.status === 'duplicate' || result.duplicate === true;
}

export const immichApi = new ImmichApi();
