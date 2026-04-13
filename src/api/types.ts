export interface Album {
	id: string;
	albumName: string;
	description?: string;
	createdAt: string;
	updatedAt: string;
	ownerId: string;
	albumThumbnailAssetId?: string;
	shared: boolean;
	assetCount: number;
	assets?: Asset[];
}

export interface Asset {
	id: string;
	deviceAssetId: string;
	ownerId: string;
	deviceId: string;
	type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'OTHER';
	originalPath: string;
	originalFileName: string;
	resized: boolean;
	fileCreatedAt: string;
	fileModifiedAt: string;
	localDateTime: string;
	updatedAt: string;
	isFavorite: boolean;
	isArchived: boolean;
	isOffline: boolean;
	duration?: string;
	exifInfo?: ExifInfo;
	livePhotoVideoId?: string;
	checksum: string;
}

export interface ExifInfo {
	make?: string;
	model?: string;
	exifImageWidth?: number;
	exifImageHeight?: number;
	fileSizeInByte?: number;
	orientation?: string;
	dateTimeOriginal?: string;
	modifyDate?: string;
	timeZone?: string;
	lensModel?: string;
	fNumber?: number;
	focalLength?: number;
	iso?: number;
	exposureTime?: string;
	latitude?: number;
	longitude?: number;
	city?: string;
	state?: string;
	country?: string;
	description?: string;
}

export interface UploadResponse {
	id: string;
	/** Newer Immich returns `"duplicate"` when the file matches an existing asset */
	status?: string;
	/** Older responses used a boolean flag */
	duplicate?: boolean;
}

export interface ApiError {
	message: string;
	statusCode: number;
	error?: string;
}

export interface TranscriptionSegment {
	start: number;
	end: number;
	text: string;
}

export interface TranscriptionResult {
	assetId: string;
	text: string;
	segments: TranscriptionSegment[];
	language: string | null;
	duration: number | null;
}
