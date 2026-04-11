import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAlbums } from '../hooks/useAlbums';
import { immichApi } from '../api/immich';
import type { Album, Asset } from '../api/types';
import { AlbumRow } from '../components/common/AlbumRow';
import { Button } from '../components/common/Button';
import styles from './Home.module.css';

interface AlbumWithVideos {
  album: Album;
  videos: Asset[];
}

export function Home() {
  const { isConnected, isLoading: authLoading } = useAuth();
  const { journalAlbums, isLoading: albumsLoading, error } = useAlbums();
  const [albumsWithVideos, setAlbumsWithVideos] = useState<AlbumWithVideos[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (journalAlbums.length === 0) {
      setAlbumsWithVideos([]);
      return;
    }

    const fetchAllAlbumDetails = async () => {
      setLoadingDetails(true);
      try {
        const results = await Promise.all(
          journalAlbums.map(async (album) => {
            const fullAlbum = await immichApi.getAlbum(album.id);
            const videos = (fullAlbum.assets || []).filter(
              (asset) => asset.type === 'VIDEO'
            );
            return { album: fullAlbum, videos };
          })
        );
        setAlbumsWithVideos(results.filter((r) => r.videos.length > 0));
      } catch (err) {
        console.error('Failed to fetch album details:', err);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchAllAlbumDetails();
  }, [journalAlbums]);

  if (authLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>Connect to Immich</h2>
          <p className={styles.emptyText}>
            Configure your Immich server connection to browse your video journals.
          </p>
          <Link to="/settings">
            <Button>Go to Settings</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (albumsLoading || loadingDetails) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading journals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>Error Loading Albums</h2>
          <p className={styles.emptyText}>{error.message}</p>
          <Link to="/settings">
            <Button>Check Settings</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (albumsWithVideos.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>No Video Journals Found</h2>
          <p className={styles.emptyText}>
            Create albums starting with "JOURNAL" in Immich to organize your video journals.
          </p>
          <Link to="/record">
            <Button>Upload a Video</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Video Journals</h1>
      </header>

      <div className={styles.albums}>
        {albumsWithVideos.map(({ album, videos }) => (
          <AlbumRow key={album.id} album={album} videos={videos} />
        ))}
      </div>
    </div>
  );
}
