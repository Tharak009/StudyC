import React, { useState } from "react";
import { ImageOff, RotateCcw } from "lucide-react";
import { getMediaUrl } from "../../../utils/media-url";

export interface GalleryItem {
  url: string;
  originalName: string;
  caption?: string;
  mimeType?: string;
}

interface ImageGalleryProps {
  images: GalleryItem[];
  onImageClick: (index: number) => void;
  isMe?: boolean;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onImageClick,
  isMe = false
}) => {
  const [loadedMap, setLoadedMap] = useState<Record<number, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<number, boolean>>({});
  const [retryKeys, setRetryKeys] = useState<Record<number, number>>({});

  const handleRetry = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setErrorMap((prev) => ({ ...prev, [index]: false }));
    setRetryKeys((prev) => ({ ...prev, [index]: (prev[index] || 0) + 1 }));
  };

  if (!images || images.length === 0) return null;

  const count = images.length;

  const renderImage = (img: GalleryItem, index: number, className: string) => {
    const isLoaded = loadedMap[index];
    const isError = errorMap[index];
    const retryCount = retryKeys[index] || 0;
    const mediaUrl = getMediaUrl(img.url);
    const srcWithRetry = retryCount > 0 ? `${mediaUrl}${mediaUrl.includes("?") ? "&" : "?"}_r=${retryCount}` : mediaUrl;

    return (
      <div
        key={index}
        onClick={() => onImageClick(index)}
        className={`relative overflow-hidden cursor-pointer group bg-slate-100 dark:bg-slate-900/60 ${className}`}
      >
        {/* Loading Skeleton */}
        {!isLoaded && !isError && (
          <div className="absolute inset-0 bg-slate-200/70 dark:bg-slate-800/70 animate-pulse flex items-center justify-center">
            <span className="text-[10px] text-slate-400 font-medium">Loading...</span>
          </div>
        )}

        {/* Error Fallback */}
        {isError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 bg-slate-100 dark:bg-slate-900 text-slate-400">
            <ImageOff size={20} className="mb-1 text-slate-400" />
            <span className="text-[10px] text-center font-medium">Image unavailable</span>
            <button
              type="button"
              onClick={(e) => handleRetry(e, index)}
              className="mt-1.5 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-[#1E90FF] transition-colors"
            >
              <RotateCcw size={10} />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <img
            src={srcWithRetry}
            alt={img.originalName || `Image ${index + 1}`}
            loading="lazy"
            onLoad={() => setLoadedMap((prev) => ({ ...prev, [index]: true }))}
            onError={() => setErrorMap((prev) => ({ ...prev, [index]: true }))}
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
      </div>
    );
  };

  // 1 Image: Large hero presentation
  if (count === 1) {
    return (
      <div className="rounded-xl overflow-hidden my-1 max-w-[320px] max-h-[300px]">
        {renderImage(images[0], 0, "h-56 sm:h-64 rounded-xl")}
      </div>
    );
  }

  // 2 Images: 2-column side-by-side
  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden my-1 max-w-[340px]">
        {images.map((img, i) => renderImage(img, i, "h-36 sm:h-44 rounded-lg"))}
      </div>
    );
  }

  // 3 Images: 1 top hero, 2 bottom side-by-side
  if (count === 3) {
    return (
      <div className="flex flex-col gap-1.5 rounded-xl overflow-hidden my-1 max-w-[340px]">
        {renderImage(images[0], 0, "h-40 sm:h-48 rounded-lg")}
        <div className="grid grid-cols-2 gap-1.5">
          {renderImage(images[1], 1, "h-28 sm:h-32 rounded-lg")}
          {renderImage(images[2], 2, "h-28 sm:h-32 rounded-lg")}
        </div>
      </div>
    );
  }

  // 4+ Images: 2x2 grid with +N badge on 4th image
  const displayImages = images.slice(0, 4);
  const remaining = count - 4;

  return (
    <div className="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden my-1 max-w-[340px]">
      {displayImages.map((img, i) => {
        if (i === 3 && remaining > 0) {
          return (
            <div
              key={i}
              onClick={() => onImageClick(3)}
              className="relative overflow-hidden cursor-pointer group h-28 sm:h-32 rounded-lg bg-slate-100 dark:bg-slate-900/60"
            >
              <img
                src={getMediaUrl(img.url)}
                alt={img.originalName}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-lg">
                +{remaining}
              </div>
            </div>
          );
        }
        return renderImage(img, i, "h-28 sm:h-32 rounded-lg");
      })}
    </div>
  );
};
