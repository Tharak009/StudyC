import { Download, LoaderCircle } from "lucide-react";
import type { Resource } from "../types/resource";

interface DownloadButtonProps {
  resource: Resource;
  onDownload: (resource: Resource) => void;
  isPending: boolean;
  size?: "sm" | "md" | "lg";
}

export function DownloadButton({ resource, onDownload, isPending, size = "md" }: DownloadButtonProps) {
  const sizeClasses = size === "sm" ? "px-3 py-1.5 text-xs" : size === "lg" ? "px-6 py-3 text-base" : "px-4 py-2 text-sm";

  const handleClick = () => {
    if (resource.fileUrl) {
      window.open(resource.fileUrl, "_blank");
    }
    onDownload(resource);
  };

  return (
    <button
      className={`primary-button gap-2 ${sizeClasses}`}
      type="button"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />}
      Download
    </button>
  );
}
