import React, { useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import type { LightboxImage } from "./MediaLightbox";

interface ImageGalleryProps {
  images: LightboxImage[];
  onOpenLightbox?: (index: number) => void;
  isSelectMode?: boolean;
}

function GalleryImageItem({
  image,
  index,
  className = "",
  onOpenLightbox,
  isSelectMode = false,
  overlayText
}: {
  image: LightboxImage;
  index: number;
  className?: string;
  onOpenLightbox?: (index: number) => void;
  isSelectMode?: boolean;
  overlayText?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div
      onClick={() => {
        if (!isSelectMode && onOpenLightbox && !error) {
          onOpenLightbox(index);
        }
      }}
      className={`relative overflow-hidden bg-slate-200/70 dark:bg-slate-800/80 transition-all ${
        !isSelectMode && !error ? "cursor-pointer hover:opacity-95" : ""
      } ${className}`}
    >
      {/* Skeleton / Loading Indicator */}
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-200/50 dark:bg-slate-800/50 animate-pulse">
          <Loader2 size={20} className="text-slate-400 animate-spin opacity-50" />
        </div>
      )}

      {/* Error Fallback */}
      {error ? (
        <div className="flex flex-col items-center justify-center w-full h-full min-h-[100px] p-4 text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/50">
          <ImageOff size={24} className="mb-1 opacity-60" />
          <span className="text-[10px]">Failed to load</span>
        </div>
      ) : (
        <img
          src={image.url}
          alt={image.title || image.fallback || `Attachment ${index + 1}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setError(true);
            setLoaded(true);
          }}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* Overlay text for +N additional photos */}
      {overlayText && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs text-white text-xl font-bold">
          {overlayText}
        </div>
      )}
    </div>
  );
}

export function ImageGallery({
  images,
  onOpenLightbox,
  isSelectMode = false
}: ImageGalleryProps) {
  if (!images || images.length === 0) return null;

  const count = images.length;

  // Single Image Layout
  if (count === 1) {
    return (
      <div className="max-w-sm sm:max-w-md rounded-2xl overflow-hidden my-1 shadow-2xs border border-slate-200/60 dark:border-slate-700/50">
        <GalleryImageItem
          image={images[0]}
          index={0}
          className="max-h-80 w-full"
          onOpenLightbox={onOpenLightbox}
          isSelectMode={isSelectMode}
        />
      </div>
    );
  }

  // 2 Images Layout: 2 equal columns
  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-1.5 max-w-sm sm:max-w-md rounded-2xl overflow-hidden my-1 shadow-2xs">
        <GalleryImageItem
          image={images[0]}
          index={0}
          className="h-44 w-full rounded-l-xl"
          onOpenLightbox={onOpenLightbox}
          isSelectMode={isSelectMode}
        />
        <GalleryImageItem
          image={images[1]}
          index={1}
          className="h-44 w-full rounded-r-xl"
          onOpenLightbox={onOpenLightbox}
          isSelectMode={isSelectMode}
        />
      </div>
    );
  }

  // 3 Images Layout: 1 large left, 2 stacked right
  if (count === 3) {
    return (
      <div className="grid grid-cols-3 gap-1.5 max-w-sm sm:max-w-md rounded-2xl overflow-hidden my-1 shadow-2xs">
        <GalleryImageItem
          image={images[0]}
          index={0}
          className="col-span-2 h-52 w-full rounded-l-xl"
          onOpenLightbox={onOpenLightbox}
          isSelectMode={isSelectMode}
        />
        <div className="flex flex-col gap-1.5 col-span-1 h-52">
          <GalleryImageItem
            image={images[1]}
            index={1}
            className="h-full w-full rounded-tr-xl"
            onOpenLightbox={onOpenLightbox}
            isSelectMode={isSelectMode}
          />
          <GalleryImageItem
            image={images[2]}
            index={2}
            className="h-full w-full rounded-br-xl"
            onOpenLightbox={onOpenLightbox}
            isSelectMode={isSelectMode}
          />
        </div>
      </div>
    );
  }

  // 4 Images Layout: 2x2 grid
  if (count === 4) {
    return (
      <div className="grid grid-cols-2 gap-1.5 max-w-sm sm:max-w-md rounded-2xl overflow-hidden my-1 shadow-2xs">
        {images.slice(0, 4).map((img, idx) => (
          <GalleryImageItem
            key={img.url || idx}
            image={img}
            index={idx}
            className="h-36 w-full rounded-xl"
            onOpenLightbox={onOpenLightbox}
            isSelectMode={isSelectMode}
          />
        ))}
      </div>
    );
  }

  // 5+ Images Layout: 2x2 grid with +N on the 4th item
  const displayImages = images.slice(0, 4);
  const remainingCount = count - 3;

  return (
    <div className="grid grid-cols-2 gap-1.5 max-w-sm sm:max-w-md rounded-2xl overflow-hidden my-1 shadow-2xs">
      {displayImages.map((img, idx) => (
        <GalleryImageItem
          key={img.url || idx}
          image={img}
          index={idx}
          className="h-36 w-full rounded-xl"
          onOpenLightbox={onOpenLightbox}
          isSelectMode={isSelectMode}
          overlayText={idx === 3 ? `+${remainingCount}` : undefined}
        />
      ))}
    </div>
  );
}
