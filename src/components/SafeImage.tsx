import React, { useState, useEffect, useRef } from 'react';

// ─── Avatar helper ────────────────────────────────────────────────────────────
export function getAvatarUrl(studentId: string, gender?: 'male' | 'female'): string {
  const base = import.meta.env.BASE_URL ?? '/';
  const g = gender ?? 'male';
  const hash = studentId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const num = (hash % 30) + 1; // 1..30
  return `${base}avatars/${g}-${num}.png`;
}

// ─── SafeImage ────────────────────────────────────────────────────────────────
interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
  shimmer?: boolean;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  fallbackSrc,
  className,
  alt,
  onError,
  shimmer = true,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [converting, setConverting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!src) return;

    const urlWithoutQuery = src.split('?')[0].split('#')[0];
    const isHeic = /\.(heic|heif)$/i.test(urlWithoutQuery);

    if (!isHeic) {
      setImgSrc(src);
      return;
    }

    let isMounted = true;
    let objectUrl: string | null = null;

    const convertHeic = async () => {
      setConverting(true);
      try {
        const response = await fetch(src);
        const blob = await response.blob();
        const heic2any = (await import('heic2any')).default;
        const result = await heic2any({ blob, toType: 'image/jpeg', quality: 0.8 });
        const resultBlob = Array.isArray(result) ? result[0] : result;
        if (isMounted) {
          objectUrl = URL.createObjectURL(resultBlob);
          setImgSrc(objectUrl);
        }
      } catch {
        if (isMounted) setImgSrc(src);
      } finally {
        if (isMounted) setConverting(false);
      }
    };

    convertHeic();
    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  // ── Key fix: if the image is already cached the browser won't fire onLoad.
  // After imgSrc is set, check img.complete immediately (next tick).
  useEffect(() => {
    setLoaded(false);
    // Use setTimeout(0) to let the browser assign the new src first
    const timer = setTimeout(() => {
      if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
        setLoaded(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [imgSrc]);

  if (converting) {
    return (
      <div className={`flex items-center justify-center bg-[#151515] ${className}`}>
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: '#1a1a1a' }}>
      {shimmer && !loaded && (
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, #1a1a1a 25%, #252525 50%, #1a1a1a 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }}
        />
      )}
      <img
        ref={imgRef}
        src={imgSrc}
        alt={alt}
        decoding="async"
        className="w-full h-full object-cover"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.2s ease' }}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(true); // hide shimmer on error too
          if (fallbackSrc && imgSrc !== fallbackSrc) setImgSrc(fallbackSrc);
        }}
        {...props}
      />
    </div>
  );
};
