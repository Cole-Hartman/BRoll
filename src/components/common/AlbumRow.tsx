import { useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Album, Asset } from '../../api/types';
import { VideoCard } from './VideoCard';
import styles from './AlbumRow.module.css';

interface AlbumRowProps {
  album: Album;
  videos: Asset[];
}

export function AlbumRow({ album, videos }: AlbumRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (videos.length === 0) return null;

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <Link to={`/album/${album.id}`} className={styles.titleLink}>
          <h2 className={styles.title}>{album.albumName}</h2>
          <span className={styles.count}>{videos.length} videos</span>
        </Link>
        <div className={styles.controls}>
          <button
            className={styles.scrollButton}
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            className={styles.scrollButton}
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </header>
      <div ref={scrollRef} className={styles.scrollContainer}>
        <div className={styles.grid}>
          {videos.map((video) => (
            <div key={video.id} className={styles.cardWrapper}>
              <VideoCard asset={video} albumId={album.id} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
