import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download
} from "lucide-react";
import { getMediaUrl } from "../../../utils/media-url";

export interface LightboxImage {
  url: string;
  originalName?: string;
  caption?: string;
}

interface ImageViewerModalProps {
  isOpen: boolean;
  images: LightboxImage[];
  initialIndex?: number;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1)));
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex, images.length]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [images.length]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [images.length]);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      } else if (e.key === "0") {
        handleResetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev, handleZoomIn, handleZoomOut, handleResetZoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen || images.length === 0) return null;

  const currentImg = images[currentIndex];
  const authenticatedUrl = getMediaUrl(currentImg?.url);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md select-none"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Image Viewer Lightbox"
      >
        {/* Top Control Bar */}
        <div
          className="absolute top-0 inset-x-0 h-16 flex items-center justify-between px-6 bg-gradient-to-b from-black/80 to-transparent z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Counter & Filename */}
          <div className="flex items-center gap-3 text-white/90 text-sm">
            <span className="font-mono bg-white/10 px-2.5 py-1 rounded-full text-xs font-semibold">
              {currentIndex + 1} / {images.length}
            </span>
            {currentImg?.originalName && (
              <span className="truncate max-w-xs md:max-w-md text-xs font-medium text-white/75">
                {currentImg.originalName}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Zoom In (+)"
              aria-label="Zoom in"
            >
              <ZoomIn size={18} />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Zoom Out (-)"
              aria-label="Zoom out"
            >
              <ZoomOut size={18} />
            </button>
            {scale > 1 && (
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Reset Zoom (0)"
                aria-label="Reset zoom"
              >
                <RotateCcw size={18} />
              </button>
            )}
            <a
              href={authenticatedUrl}
              download={currentImg?.originalName || `image-${currentIndex + 1}.png`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Download image"
              aria-label="Download image"
            >
              <Download size={18} />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-rose-500/80 hover:bg-rose-600 text-white transition-colors cursor-pointer ml-2"
              title="Close (Esc)"
              aria-label="Close image viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Carousel Previous Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all backdrop-blur-sm z-10 cursor-pointer"
            aria-label="Previous image"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Carousel Next Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all backdrop-blur-sm z-10 cursor-pointer"
            aria-label="Next image"
          >
            <ChevronRight size={24} />
          </button>
        )}

        {/* Image Display Area */}
        <div
          className="relative max-w-full max-h-full p-4 flex items-center justify-center overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
        >
          <motion.img
            key={currentIndex}
            src={authenticatedUrl}
            alt={currentImg?.originalName || "Image preview"}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-transform"
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              pointerEvents: scale > 1 ? "auto" : "none"
            }}
            draggable={false}
          />
        </div>

        {/* Bottom Caption Bar */}
        {currentImg?.caption && (
          <div
            className="absolute bottom-0 inset-x-0 p-4 pb-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center text-center z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="max-w-2xl px-4 py-2 rounded-xl bg-black/50 backdrop-blur-md text-white/90 text-sm leading-relaxed">
              {currentImg.caption}
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
