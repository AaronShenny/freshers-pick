import React, { useState, useEffect } from 'react';

// ─── Avatar helper ────────────────────────────────────────────────────────────
// Picks a deterministic avatar from /public/avatars/male-{1-30}.png or female-{1-30}.png
// based on the student's id so the same person always gets the same avatar.
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
  shimmer?: boolean; // show shimmer placeholder while loading (default: true)
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
  const [converting, setConverting] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    setLoaded(false);
    if (!src) return;

    // Check if URL points to a HEIC/HEIF image
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

        // Dynamically import heic2any to keep initial bundle size small
        const heic2any = (await import('heic2any')).default;
        
        const conversionResult = await heic2any({
          blob,
          toType: 'image/jpeg',
          quality: 0.8
        });

        // heic2any can return an array of blobs if it's animated/multiple HEIC
        const resultBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
        
        if (isMounted) {
          objectUrl = URL.createObjectURL(resultBlob);
          setImgSrc(objectUrl);
        }
      } catch (err) {
        console.error('Failed to convert HEIC image:', err);
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

  if (converting) {
    return (
      <div className={`flex items-center justify-center bg-[#151515] ${className}`}>
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: '#1a1a1a' }}>
      {/* Shimmer skeleton shown while image loads */}
      {shimmer && !loaded && (
        <div
          className="absolute inset-0 z-10"
          style={{
            background: 'linear-gradient(90deg, #1a1a1a 25%, #252525 50%, #1a1a1a 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }}
        />
      )}
      <img
        src={imgSrc}
        alt={alt}
        decoding="async"
        className="w-full h-full object-cover"
        style={{
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          setLoaded(true); // hide shimmer even on error
          if (fallbackSrc) setImgSrc(fallbackSrc);
          if (onError) onError(e);
        }}
        {...props}
      />
    </div>
  );
};
