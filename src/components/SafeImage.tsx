import React, { useState, useEffect } from 'react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({ src, fallbackSrc, className, alt, onError, ...props }) => {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [converting, setConverting] = useState<boolean>(false);

  useEffect(() => {
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

        // heic2any can return an array of blobs if it's an animated/multiple HEIC file
        const resultBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
        
        if (isMounted) {
          objectUrl = URL.createObjectURL(resultBlob);
          setImgSrc(objectUrl);
        }
      } catch (err) {
        console.error('Failed to convert HEIC image:', err);
        // Fallback to original src if conversion fails
        if (isMounted) {
          setImgSrc(src);
        }
      } finally {
        if (isMounted) {
          setConverting(false);
        }
      }
    };

    convertHeic();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
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
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        if (fallbackSrc) {
          setImgSrc(fallbackSrc);
        }
        if (onError) onError(e);
      }}
      {...props}
    />
  );
};
