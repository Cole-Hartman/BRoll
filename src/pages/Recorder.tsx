import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAlbums } from '../hooks/useAlbums';
import { immichApi } from '../api/immich';
import { Button } from '../components/common/Button';
import styles from './Recorder.module.css';

export function Recorder() {
  const navigate = useNavigate();
  const { isConnected } = useAuth();
  const { journalAlbums, isLoading: albumsLoading } = useAlbums();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (journalAlbums.length > 0 && !selectedAlbumId) {
      setSelectedAlbumId(journalAlbums[0].id);
    }
  }, [journalAlbums, selectedAlbumId]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleClear = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setDescription('');
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedAlbumId) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploadResult = await immichApi.uploadAsset(selectedFile, description || undefined);
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
          <p>You need to connect to your Immich server to upload videos.</p>
          <Button onClick={() => navigate('/settings')}>Go to Settings</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Upload Video</h1>
      </header>

      <div className={styles.content}>
        <div
          className={styles.videoArea}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {!selectedFile && (
            <div className={styles.placeholder}>
              <div className={styles.placeholderIcon}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className={styles.placeholderText}>
                Drag and drop a video here, or click to select
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className={styles.fileInput}
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                Select Video
              </Button>
            </div>
          )}

          {previewUrl && (
            <video
              className={styles.video}
              src={previewUrl}
              controls
            />
          )}
        </div>

        {selectedFile && (
          <>
            <div className={styles.uploadSection}>
              <label className={styles.label}>Description (optional)</label>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this video..."
                rows={3}
              />
            </div>

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
              <Button variant="ghost" onClick={handleClear} disabled={isUploading}>
                Clear
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
  );
}
