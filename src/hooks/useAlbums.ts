import { useState, useEffect, useCallback, useMemo } from 'react';
import { immichApi } from '../api/immich';
import type { Album } from '../api/types';
import { useAuth } from '../contexts/AuthContext';

interface UseAlbumsResult {
  albums: Album[];
  journalAlbums: Album[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAlbums(): UseAlbumsResult {
  const { isConnected } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAlbums = useCallback(async () => {
    if (!isConnected) {
      setAlbums([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await immichApi.getAlbums();
      setAlbums(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch albums'));
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  const journalAlbums = useMemo(() =>
    albums.filter(album => album.albumName.toUpperCase().startsWith('JOURNAL')),
    [albums]
  );

  return {
    albums,
    journalAlbums,
    isLoading,
    error,
    refetch: fetchAlbums,
  };
}
