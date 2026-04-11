import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAlbums } from '../hooks/useAlbums';
import { useMediaRecorder, type RecordingMode } from '../hooks/useMediaRecorder';
import { immichApi } from '../api/immich';
import { Button } from '../components/common/Button';
import styles from './Recorder.module.css';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function Recorder() {
  const navigate = useNavigate();
  const { isConnected } = useAuth();
  const { journalAlbums, isLoading: albumsLoading } = useAlbums();

  const [mode, setMode] = useState<RecordingMode>('camera');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const previewRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement>(null);

  const {
    state,
    stream,
    recordedBlob,
    recordedUrl,
    duration,
    error,
    startPreview,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardRecording,
    stopPreview,
  } = useMediaRecorder({ mode });

  useEffect(() => {
    if (stream && previewRef.current) {
      previewRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (journalAlbums.length > 0 && !selectedAlbumId) {
      setSelectedAlbumId(journalAlbums[0].id);
    }
  }, [journalAlbums, selectedAlbumId]);

  const handleModeChange = async (newMode: RecordingMode) => {
    if (state !== 'idle') {
      stopPreview();
    }
    setMode(newMode);
  };

  const handleUpload = async () => {
    if (!recordedBlob || !selectedAlbumId) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const filename = `journal-${timestamp}.${extension}`;
      const file = new File([recordedBlob], filename, { type: recordedBlob.type });

      const uploadResult = await immichApi.uploadAsset(file);
      await immichApi.addAssetsToAlbum(selectedAlbumId, [uploadResult.id]);

      navigate(`/album/${selectedAlbumId}`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <h2>Connect to Immich</h2>
          <p>You need to connect to your Immich server to record videos.</p>
          <Button onClick={() => navigate('/settings')}>Go to Settings</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Record</h1>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeButton} ${mode === 'camera' ? styles.active : ''}`}
            onClick={() => handleModeChange('camera')}
            disabled={state !== 'idle' && state !== 'preview'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            Camera
          </button>
          <button
            className={`${styles.modeButton} ${mode === 'screen' ? styles.active : ''}`}
            onClick={() => handleModeChange('screen')}
            disabled={state !== 'idle' && state !== 'preview'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            Screen
          </button>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.videoArea}>
          {state === 'idle' && (
            <div className={styles.placeholder}>
              <div className={styles.placeholderIcon}>
                {mode === 'camera' ? (
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M23 7l-7 5 7 5V7z" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                ) : (
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                )}
              </div>
              <p className={styles.placeholderText}>
                {mode === 'camera'
                  ? 'Click Start to access your camera'
                  : 'Click Start to share your screen'}
              </p>
              <Button onClick={startPreview}>Start Preview</Button>
            </div>
          )}

          {(state === 'preview' || state === 'recording' || state === 'paused') && (
            <video
              ref={previewRef}
              className={styles.video}
              autoPlay
              muted
              playsInline
            />
          )}

          {state === 'recorded' && recordedUrl && (
            <video
              ref={playbackRef}
              className={styles.video}
              src={recordedUrl}
              controls
            />
          )}

          {(state === 'recording' || state === 'paused') && (
            <div className={styles.recordingIndicator}>
              <span className={`${styles.recordingDot} ${state === 'paused' ? styles.paused : ''}`} />
              <span className={styles.recordingTime}>{formatDuration(duration)}</span>
            </div>
          )}

          {error && (
            <div className={styles.errorOverlay}>
              <p>{error.message}</p>
              <Button onClick={startPreview}>Try Again</Button>
            </div>
          )}
        </div>

        <div className={styles.controlsArea}>
          {state === 'preview' && (
            <div className={styles.controlsRow}>
              <Button variant="ghost" onClick={stopPreview}>
                Cancel
              </Button>
              <Button onClick={startRecording}>
                <span className={styles.recordIcon} />
                Start Recording
              </Button>
            </div>
          )}

          {state === 'recording' && (
            <div className={styles.controlsRow}>
              <Button variant="ghost" onClick={pauseRecording}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                Pause
              </Button>
              <Button variant="danger" onClick={stopRecording}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
                Stop
              </Button>
            </div>
          )}

          {state === 'paused' && (
            <div className={styles.controlsRow}>
              <Button variant="ghost" onClick={discardRecording}>
                Discard
              </Button>
              <Button variant="secondary" onClick={resumeRecording}>
                Resume
              </Button>
              <Button variant="danger" onClick={stopRecording}>
                Stop
              </Button>
            </div>
          )}

          {state === 'recorded' && (
            <>
              <div className={styles.uploadSection}>
                <label className={styles.label}>Save to Album</label>
                <select
                  className={styles.select}
                  value={selectedAlbumId}
                  onChange={(e) => setSelectedAlbumId(e.target.value)}
                  disabled={albumsLoading || isUploading}
                >
                  {journalAlbums.map((album) => (
                    <option key={album.id} value={album.id}>
                      {album.albumName}
                    </option>
                  ))}
                </select>
                {journalAlbums.length === 0 && !albumsLoading && (
                  <p className={styles.hint}>
                    Create an album starting with "JOURNAL" in Immich first.
                  </p>
                )}
              </div>

              {uploadError && (
                <div className={styles.uploadError}>{uploadError}</div>
              )}

              <div className={styles.controlsRow}>
                <Button variant="ghost" onClick={discardRecording}>
                  Discard
                </Button>
                <Button
                  onClick={handleUpload}
                  isLoading={isUploading}
                  disabled={!selectedAlbumId || journalAlbums.length === 0}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
