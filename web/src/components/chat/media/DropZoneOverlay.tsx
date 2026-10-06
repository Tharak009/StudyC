import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud } from "lucide-react";

interface DropZoneOverlayProps {
  isDragging: boolean;
}

export function DropZoneOverlay({ isDragging }: DropZoneOverlayProps) {
  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-[#005FFF]/10 dark:bg-[#005FFF]/15 backdrop-blur-xs pointer-events-none"
        >
          <div className="w-full h-full rounded-3xl border-2 border-dashed border-[#005FFF] dark:border-sky-400 flex flex-col items-center justify-center gap-3 bg-white/80 dark:bg-[#0B1323]/85 text-slate-800 dark:text-slate-100 shadow-2xl p-8">
            <div className="p-4 rounded-2xl bg-[#005FFF]/15 text-[#005FFF] dark:text-sky-400">
              <UploadCloud size={42} />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-slate-900 dark:text-white">
                Drop files here to upload
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Images, documents, and code files will be added to your message
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
