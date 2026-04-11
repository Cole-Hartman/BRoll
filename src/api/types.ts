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
  duplicate: boolean;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
