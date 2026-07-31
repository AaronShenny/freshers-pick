import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Avatar helper ────────────────────────────────────────────────────────────
export function getAvatarUrl(studentId: string, gender?: 'male' | 'female'): string {
  const base = import.meta.env.BASE_URL ?? '/';
  const g = gender ?? 'male';
  const hash = studentId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const count = g === 'female' ? 9 : 11; // female: 1..9, male: 1..11
  const num = String((hash % count) + 1).padStart(2, '0'); // e.g. 01, 02 ... 11
  return `${base}avatars/${g}_${num}.png`;
}

// ─── HEIC converter (shared helper) ──────────────────────────────────────────
async function convertHeicUrl(src: string): Promise<string> {
  console.log('Attempting HEIC conversion for:', src);
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }
  const blob = await response.blob();
  const heicModule = await import('heic2any');
  const heic2any = heicModule.default || heicModule;
  
  const result = await heic2any({ blob, toType: 'image/jpeg', quality: 0.85 });
  const resultBlob = Array.isArray(result) ? result[0] : result;
  return URL.createObjectURL(resultBlob);
}

function isHeicUrl(url: string): boolean {
  const clean = url.split('?')[0].split('#')[0];
  return /\.(heic|heif)$/i.test(clean);
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
  shimmer = true,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [converting, setConverting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // Track object URLs we create so we can revoke them
  const objectUrlRef = useRef<string | null>(null);

  const revokeObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  // ── On src change: if URL explicitly ends in .heic/.heif, convert up-front ──
  useEffect(() => {
    if (!src) return;
    revokeObjectUrl();

    // Prevent Security Error if the database contains local file paths (e.g., file:///)
    if (src.startsWith('file://') && window.location.protocol !== 'file:') {
      console.warn('Blocked attempt to load local file URI from web:', src);
      if (fallbackSrc) setImgSrc(fallbackSrc);
      return;
    }

    if (!isHeicUrl(src)) {
      setImgSrc(src);
      return;
    }

    let isMounted = true;
    setConverting(true);

    convertHeicUrl(src)
      .then(objUrl => {
        if (!isMounted) { URL.revokeObjectURL(objUrl); return; }
        objectUrlRef.current = objUrl;
        setImgSrc(objUrl);
      })
      .catch(() => { if (isMounted) setImgSrc(src); })
      .finally(() => { if (isMounted) setConverting(false); });

    return () => { isMounted = false; };
  }, [src]);

  // ── Key fix: cached images won't fire onLoad — check img.complete immediately ──
  useEffect(() => {
    setLoaded(false);
    const timer = setTimeout(() => {
      if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
        setLoaded(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [imgSrc]);

  // Cleanup object URLs on unmount
  useEffect(() => () => revokeObjectUrl(), []);

  // ── On image error: try HEIC conversion regardless of extension ─────────────
  // This handles cases where: Supabase URL has no extension, or file is HEIC
  // but was renamed to .jpg/.png (common with iPhone photos saved manually).
  const handleError = useCallback(async () => {
    setLoaded(true); // always dismiss shimmer

    // Already tried conversion or already an object URL — fall back
    if (imgSrc.startsWith('blob:') || imgSrc === fallbackSrc) {
      if (fallbackSrc && imgSrc !== fallbackSrc) setImgSrc(fallbackSrc);
      return;
    }

    // Try HEIC conversion as a last resort
    setConverting(true);
    try {
      const objUrl = await convertHeicUrl(imgSrc);
      revokeObjectUrl();
      objectUrlRef.current = objUrl;
      setImgSrc(objUrl);
    } catch (err) {
      console.error('HEIC conversion failed:', err);
      // Conversion failed too — use fallback
      if (fallbackSrc) setImgSrc(fallbackSrc);
    } finally {
      setConverting(false);
    }
  }, [imgSrc, fallbackSrc]);

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
        onError={handleError}
        {...props}
      />
    </div>
  );
};
