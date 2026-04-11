import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { immichApi } from '../../api/immich';
import type { Asset } from '../../api/types';
import styles from './VideoCard.module.css';

interface VideoCardProps {
  asset: Asset;
  albumId?: string;
}

function formatDuration(durationStr?: string): string {
  if (!durationStr) return '';

  const match = durationStr.match(/(\d+):(\d+):(\d+)/);
  if (!match) return durationStr;

  const [, hours, minutes, seconds] = match;
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  const s = parseInt(seconds, 10);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function VideoCard({ asset, albumId }: VideoCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const thumbnailUrl = immichApi.getThumbnailUrl(asset.id);
  const linkTo = albumId
    ? `/album/${albumId}/video/${asset.id}`
    : `/video/${asset.id}`;

  return (
    <Link to={linkTo} className={styles.card}>
      <div className={styles.thumbnailWrapper}>
        <img
          ref={imgRef}
          src={isVisible ? thumbnailUrl : undefined}
          alt={asset.originalFileName}
          className={`${styles.thumbnail} ${isLoaded ? styles.loaded : ''}`}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
        />
        {!isLoaded && <div className={styles.skeleton} />}
        {asset.duration && (
          <span className={styles.duration}>{formatDuration(asset.duration)}</span>
        )}
      </div>
      <div className={styles.info}>
        <h3 className={styles.title}>
          {asset.exifInfo?.description || asset.originalFileName}
        </h3>
        <p className={styles.date}>{formatDate(asset.fileCreatedAt)}</p>
      </div>
    </Link>
  );
}
