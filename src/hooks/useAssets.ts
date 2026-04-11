import { useState, useEffect, useCallback } from 'react';
import { immichApi } from '../api/immich';
import type { Album, Asset } from '../api/types';
import { useAuth } from '../contexts/AuthContext';

interface UseAssetsResult {
  album: Album | null;
  assets: Asset[];
  videos: Asset[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAssets(albumId: string | undefined): UseAssetsResult {
  const { isConnected } = useAuth();
  const [album, setAlbum] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAlbum = useCallback(async () => {
    if (!isConnected || !albumId) {
      setAlbum(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await immichApi.getAlbum(albumId);
      setAlbum(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch album'));
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, albumId]);

  useEffect(() => {
    fetchAlbum();
  }, [fetchAlbum]);

  const assets = album?.assets || [];
  const videos = assets.filter(asset => asset.type === 'VIDEO');

  return {
    album,
    assets,
    videos,
    isLoading,
    error,
    refetch: fetchAlbum,
  };
}
