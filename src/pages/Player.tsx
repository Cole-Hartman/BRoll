import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { immichApi } from '../api/immich';
import { useAlbums } from '../hooks/useAlbums';
import type { Asset } from '../api/types';
import { Button } from '../components/common/Button';
import styles from './Player.module.css';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function Player() {
  const { assetId, albumId } = useParams<{ assetId: string; albumId?: string }>();
  const navigate = useNavigate();
  const { journalAlbums } = useAlbums();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [currentAlbumId, setCurrentAlbumId] = useState<string | undefined>(albumId);
  const [isChangingAlbum, setIsChangingAlbum] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const hideControlsTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!assetId) return;

    const fetchAsset = async () => {
      setIsLoading(true);
      try {
        const data = await immichApi.getAsset(assetId);
        setAsset(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load video'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAsset();
  }, [assetId]);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    if (isPlaying) {
      hideControlsTimer.current = window.setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, []);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = percent * duration;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    setIsMuted(value === 0);
    if (videoRef.current) {
      videoRef.current.volume = value;
      videoRef.current.muted = value === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleBack = () => {
    if (albumId) {
      navigate(`/album/${albumId}`);
    } else {
      navigate('/');
    }
  };

  const handleEditStart = () => {
    setEditDescription(asset?.exifInfo?.description || '');
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditDescription('');
  };

  const handleEditSave = async () => {
    if (!assetId) return;
    setIsSaving(true);
    try {
      await immichApi.updateAsset(assetId, { description: editDescription });
      setAsset(prev => prev ? {
        ...prev,
        exifInfo: { ...prev.exifInfo, description: editDescription }
      } : null);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save description:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAlbumChange = async (newAlbumId: string) => {
    if (!assetId || newAlbumId === currentAlbumId) return;
    setIsChangingAlbum(true);
    try {
      // Remove from current album if exists
      if (currentAlbumId) {
        await immichApi.removeAssetsFromAlbum(currentAlbumId, [assetId]);
      }
      // Add to new album
      await immichApi.addAssetsToAlbum(newAlbumId, [assetId]);
      setCurrentAlbumId(newAlbumId);
      // Update URL to reflect new album
      navigate(`/album/${newAlbumId}/video/${assetId}`, { replace: true });
    } catch (err) {
      console.error('Failed to change album:', err);
    } finally {
      setIsChangingAlbum(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !asset || !assetId) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Video Not Found</h2>
          <p>{error?.message || 'This video could not be loaded.'}</p>
          <button className={styles.backButton} onClick={handleBack}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const videoUrl = immichApi.getVideoUrl(assetId);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={styles.container}>
      <button className={styles.backButton} onClick={handleBack}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div
        ref={containerRef}
        className={`${styles.playerWrapper} ${showControls ? '' : styles.hideControls}`}
        onMouseMove={resetControlsTimer}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        <video
          ref={videoRef}
          className={styles.video}
          src={videoUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onClick={handlePlayPause}
        />

        <div className={styles.controls}>
          <div className={styles.bottomControls}>
            <div
              ref={progressRef}
              className={styles.progressBar}
              onClick={handleSeek}
            >
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>

            <div className={styles.controlsRow}>
              <div className={styles.leftControls}>
                <button className={styles.controlButton} onClick={handlePlayPause}>
                  {isPlaying ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  )}
                </button>

                <div className={styles.volumeControl}>
                  <button className={styles.controlButton} onClick={toggleMute}>
                    {isMuted || volume === 0 ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                        <line x1="23" y1="9" x2="17" y2="15" />
                        <line x1="17" y1="9" x2="23" y2="15" />
                      </svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      </svg>
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className={styles.volumeSlider}
                  />
                </div>

                <span className={styles.time}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className={styles.rightControls}>
                <button className={styles.controlButton} onClick={toggleFullscreen}>
                  {isFullscreen ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.metadata}>
        <h1 className={styles.title}>
          {asset.exifInfo?.description || asset.originalFileName}
        </h1>
        <p className={styles.date}>{formatDate(asset.fileCreatedAt)}</p>

        <div className={styles.descriptionSection}>
          {isEditing ? (
            <div className={styles.editForm}>
              <textarea
                className={styles.editTextarea}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Add a description..."
                rows={3}
                autoFocus
              />
              <div className={styles.editActions}>
                <Button variant="ghost" onClick={handleEditCancel} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleEditSave} isLoading={isSaving}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <button className={styles.editButton} onClick={handleEditStart}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              {asset.exifInfo?.description ? 'Edit description' : 'Add description'}
            </button>
          )}
        </div>

        <div className={styles.albumSection}>
          <label className={styles.albumLabel}>Album</label>
          <select
            className={styles.albumSelect}
            value={currentAlbumId || ''}
            onChange={(e) => handleAlbumChange(e.target.value)}
            disabled={isChangingAlbum}
          >
            {!currentAlbumId && <option value="">Select an album</option>}
            {journalAlbums.map((album) => (
              <option key={album.id} value={album.id}>
                {album.albumName}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
