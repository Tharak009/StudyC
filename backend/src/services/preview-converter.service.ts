import path from "node:path";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { env } from "../config/env.js";
import { sharedStorageService } from "./storage.service.js";

const execFileAsync = promisify(execFile);

export class PreviewConverterService {
  private previewDir: string;
  private scriptPath: string;

  constructor() {
    const defaultUploadsRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
    const uploadsCandidates: string[] = [
      defaultUploadsRoot,
      path.resolve(process.cwd(), "backend", env.UPLOAD_DIR)
    ];
    const uploadsRoot = uploadsCandidates.find((c) => fs.existsSync(path.join(c, "previews"))) || uploadsCandidates.find((c) => fs.existsSync(c)) || defaultUploadsRoot;
    this.previewDir = path.join(uploadsRoot, "previews");

    const defaultScript = path.resolve(process.cwd(), "src/scripts/convert_office.ps1");
    const scriptCandidates: string[] = [
      defaultScript,
      path.resolve(process.cwd(), "backend/src/scripts/convert_office.ps1")
    ];
    this.scriptPath = scriptCandidates.find((p) => fs.existsSync(p)) || defaultScript;
  }

  async getOrGeneratePreviewUrl(
    resourceId: string,
    fileUrl: string,
    fileName: string
  ): Promise<string | null> {
    const ext = this.getFileExtension(fileName || fileUrl);

    // PDFs need no conversion
    if (ext === "pdf") {
      return fileUrl;
    }

    // Only convert Office files (PPTX, PPT, DOCX, DOC)
    if (!["pptx", "ppt", "docx", "doc"].includes(ext)) {
      return null;
    }

    // Ensure preview directory exists
    if (!fs.existsSync(this.previewDir)) {
      await fs.promises.mkdir(this.previewDir, { recursive: true });
    }

    const previewFileName = `preview_${resourceId}.pdf`;
    const previewFilePath = path.join(this.previewDir, previewFileName);
    const publicPreviewUrl = `/uploads/previews/${previewFileName}`;

    // 1. Return cached PDF if already generated across any candidate directories
    const candidatePreviewDirs = [
      this.previewDir,
      path.resolve(process.cwd(), env.UPLOAD_DIR, "previews"),
      path.resolve(process.cwd(), "backend", env.UPLOAD_DIR, "previews")
    ];
    for (const dir of candidatePreviewDirs) {
      if (fs.existsSync(path.join(dir, previewFileName))) {
        return publicPreviewUrl;
      }
    }

    // 2. Resolve local path of original file on disk across candidate upload directories
    const possibleUploadRoots = [
      path.resolve(process.cwd(), env.UPLOAD_DIR),
      path.resolve(process.cwd(), "backend", env.UPLOAD_DIR)
    ];
    let originalLocalPath = "";
    for (const root of possibleUploadRoots) {
      const resolved = fileUrl.startsWith("/uploads/")
        ? path.resolve(root, fileUrl.replace(/^\/uploads\//, ""))
        : path.resolve(root, fileUrl);
      if (fs.existsSync(resolved)) {
        originalLocalPath = resolved;
        break;
      }
    }
    const fallbackRoot = possibleUploadRoots[0] || path.resolve(process.cwd(), env.UPLOAD_DIR);
    if (!originalLocalPath) {
      originalLocalPath = fileUrl.startsWith("/uploads/")
        ? path.resolve(fallbackRoot, fileUrl.replace(/^\/uploads\//, ""))
        : path.resolve(fallbackRoot, fileUrl);
    }

    let isTempDownloaded = false;

    if (!fs.existsSync(originalLocalPath)) {
      // Check recursive search in uploads dir
      const uploadsRoot = possibleUploadRoots.find((r) => fs.existsSync(r)) || fallbackRoot;
      const found = this.findFileInDir(uploadsRoot, path.basename(fileUrl));
      if (found) {
        originalLocalPath = found;
      } else if (sharedStorageService.isCloudActive() && !fileUrl.startsWith("/")) {
        // Attempt to download the cloud object to a temporary local file for conversion
        const tempOriginalPath = path.join(this.previewDir, `temp_${resourceId}_${fileName || path.basename(fileUrl)}`);
        const downloaded = await sharedStorageService.downloadCloudObjectToPath(fileUrl, tempOriginalPath);
        if (downloaded) {
          originalLocalPath = tempOriginalPath;
          isTempDownloaded = true;
        } else {
          return null;
        }
      } else {
        return null;
      }
    }

    // 3. Execute PowerShell conversion pipeline
    try {
      const scriptCandidates = [
        this.scriptPath,
        path.resolve(process.cwd(), "src/scripts/convert_office.ps1"),
        path.resolve(process.cwd(), "backend/src/scripts/convert_office.ps1")
      ];
      const activeScript = scriptCandidates.find((p) => fs.existsSync(p));
      if (process.platform === "win32" && activeScript) {
        await execFileAsync("powershell", [
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          activeScript,
          "-type",
          ext,
          "-inputPath",
          originalLocalPath,
          "-outputPath",
          previewFilePath
        ], { timeout: 30000 });

        if (fs.existsSync(previewFilePath)) {
          return publicPreviewUrl;
        }
      }
    } catch (err) {
      console.warn(`[PreviewConverterService] Failed to convert ${fileName} to PDF:`, err);
    } finally {
      if (isTempDownloaded) {
        await fs.promises.unlink(originalLocalPath).catch(() => {});
      }
    }

    return null;
  }

  async cleanPreviewFile(resourceId: string): Promise<void> {
    const previewFileName = `preview_${resourceId}.pdf`;
    const previewFilePath = path.join(this.previewDir, previewFileName);
    if (fs.existsSync(previewFilePath)) {
      await fs.promises.unlink(previewFilePath).catch(() => {});
    }
  }

  private getFileExtension(fn: string): string {
    const match = fn.match(/\.([a-zA-Z0-9]+)$/);
    return match && match[1] ? match[1].toLowerCase() : "";
  }

  private findFileInDir(dir: string, filename: string): string | null {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = this.findFileInDir(full, filename);
        if (found) return found;
      } else if (entry.name === filename || entry.name.endsWith(`_${filename}`)) {
        return full;
      }
    }
    return null;
  }
}

export const previewConverterService = new PreviewConverterService();
