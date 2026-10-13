import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import Prism from "prismjs";
import {
  FileText,
  FileCode,
  Table,
  Presentation,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Check,
  Search,
  Download,
  Info
} from "lucide-react";
import { apiClient } from "../../api/client";
import axios from "axios";
import { tokenService } from "../../services/token.service";
import type { VaultResource } from "./ResourceCard";
import { PdfDocumentViewer, type SearchMatch } from "./PdfDocumentViewer";

// Ensure basic Prism language definitions are available
import "prismjs/components/prism-clike";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-json";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";

interface DocumentContentRendererProps {
  resource: VaultResource;
  zoomLevel: number;
  fitMode?: "page" | "width";
  targetPage?: number;
  searchQuery?: string;
  activeMatchIndex?: number;
  navigationTick?: number;
  onDownload: (res: VaultResource) => void;
  onPageChange?: (currentPage: number, totalPages: number) => void;
  onSearchResultsChange?: (results: { total: number; matches: SearchMatch[]; isSearching?: boolean }) => void;
}

interface ParsedSlide {
  slideNumber: number;
  title: string;
  texts: string[];
  images: string[];
  tables: string[][][];
}

interface ZipEntry {
  name: string;
  size: number;
  isDir: boolean;
  date?: Date;
}

interface IpynbCell {
  cell_type: "markdown" | "code" | "raw";
  source: string[] | string;
  outputs?: Array<{
    output_type: string;
    text?: string[] | string;
    data?: {
      "text/plain"?: string[] | string;
      "image/png"?: string;
      "image/jpeg"?: string;
      "text/html"?: string[] | string;
    };
  }>;
}

export function DocumentContentRenderer({
  resource,
  zoomLevel,
  fitMode,
  targetPage,
  searchQuery,
  activeMatchIndex,
  navigationTick,
  onDownload,
  onPageChange,
  onSearchResultsChange
}: DocumentContentRendererProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Format-specific state
  const [contentType, setContentType] = useState<
    "pdf" | "docx" | "pptx" | "xlsx" | "ipynb" | "code" | "image" | "media" | "zip" | "unsupported"
  >("unsupported");
  
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null);
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);

  const handlePdfFallback = useCallback(async () => {
    const fallbackUrl = pdfUrlRef.current;
    if (!fallbackUrl) return;
    try {
      setLoading(true);
      const isExternalCloud =
        (fallbackUrl.startsWith("http://") || fallbackUrl.startsWith("https://")) &&
        (typeof window === "undefined" || !fallbackUrl.includes(window.location.host));
      let buffer: ArrayBuffer;
      if (isExternalCloud) {
        const resp = await fetch(fallbackUrl);
        if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
        buffer = await resp.arrayBuffer();
      } else {
        const res = await apiClient.get(fallbackUrl, { responseType: "arraybuffer" });
        buffer = res.data as ArrayBuffer;
      }
      setPdfArrayBuffer(buffer);
      setPdfUrl(null);
    } catch (err: any) {
      setError(err?.message || "Failed to download document via fallback.");
    } finally {
      setLoading(false);
    }
  }, []);
  
  // DOCX HTML content
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [docxTextCount, setDocxTextCount] = useState<{ words: number; paras: number } | null>(null);
  
  // PPTX state
  const [slides, setSlides] = useState<ParsedSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Sync targetPage to PPTX currentSlideIndex
  useEffect(() => {
    if (contentType === "pptx" && targetPage && targetPage >= 1 && targetPage <= slides.length) {
      setCurrentSlideIndex(targetPage - 1);
    }
  }, [contentType, targetPage, slides.length]);

  // Execute text search across PPTX slides
  useEffect(() => {
    if (contentType !== "pptx" || !searchQuery || !searchQuery.trim()) {
      if (contentType === "pptx") {
        onSearchResultsChange?.({ total: 0, matches: [] });
      }
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    const matches: SearchMatch[] = [];

    slides.forEach((s) => {
      const fullSlideText = (s.title + " " + s.texts.join(" ")).toLowerCase();
      let pos = fullSlideText.indexOf(q);
      while (pos !== -1) {
        const start = Math.max(0, pos - 20);
        const end = Math.min(fullSlideText.length, pos + q.length + 20);
        const snippet = fullSlideText.substring(start, end).trim();
        matches.push({
          id: `pptx-match-${matches.length}`,
          pageNumber: s.slideNumber,
          snippet,
          matchText: q
        });
        pos = fullSlideText.indexOf(q, pos + q.length);
      }
    });

    onSearchResultsChange?.({ total: matches.length, matches });
  }, [contentType, slides, searchQuery]);

  // Execute text search across DOCX HTML content
  useEffect(() => {
    if (contentType !== "docx" || !docxHtml || !searchQuery || !searchQuery.trim()) {
      if (contentType === "docx") {
        onSearchResultsChange?.({ total: 0, matches: [] });
      }
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = docxHtml;
    const plainText = tempDiv.textContent || "";
    const lowerText = plainText.toLowerCase();

    const matches: SearchMatch[] = [];
    let pos = lowerText.indexOf(q);

    while (pos !== -1) {
      const start = Math.max(0, pos - 30);
      const end = Math.min(plainText.length, pos + q.length + 30);
      const snippet = plainText.substring(start, end).trim();

      const isHeading = /unit|chapter|section|module|part|overview|architecture|consensus|introduction|hyperledger/i.test(snippet);

      matches.push({
        id: `docx-match-${matches.length}`,
        pageNumber: 1,
        snippet,
        matchText: q,
        isHeading,
        headingTitle: isHeading ? snippet : undefined
      });

      pos = lowerText.indexOf(q, pos + q.length);
    }

    onSearchResultsChange?.({ total: matches.length, matches });
  }, [contentType, docxHtml, searchQuery]);
  
  // XLSX state
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [sheetHtmlMap, setSheetHtmlMap] = useState<Record<string, string>>({});
  
  // IPYNB state
  const [ipynbCells, setIpynbCells] = useState<IpynbCell[]>([]);
  
  // Code / Text state
  const [rawTextContent, setRawTextContent] = useState<string>("");
  const [syntaxHighlightedHtml, setSyntaxHighlightedHtml] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState(false);
  
  // ZIP state
  const [zipEntries, setZipEntries] = useState<ZipEntry[]>([]);
  const loadedResourceIdRef = useRef<string | null>(null);

  // Determine extension & format type
  const extension = useMemo(() => {
    const fn = resource.title || (resource as any).fileName || "";
    const extMatch = fn.match(/\.([a-zA-Z0-9]+)$/);
    if (extMatch) return extMatch[1].toLowerCase();
    
    // Fallback to resource format property
    return (resource.format || "").toLowerCase();
  }, [resource]);

  useEffect(() => {
    let isMounted = true;
    let createdObjectUrl: string | null = null;

    async function loadDocument() {
      if (loadedResourceIdRef.current === resource.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Fetch preview URL or download URL via authenticated API
        let targetUrl = resource.fileUrl;
        let isConvertedPreview = false;

        try {
          const previewRes = await apiClient.get<{ data: { previewUrl: string; isConvertedPdf: boolean } }>(
            `/api/resources/${resource.id}/preview-url`
          );
          if (previewRes.data?.data?.previewUrl) {
            targetUrl = previewRes.data.data.previewUrl;
            isConvertedPreview = previewRes.data.data.isConvertedPdf;
          }
        } catch {
          if (!targetUrl || targetUrl === "#" || targetUrl.startsWith("/uploads/") || targetUrl.includes("/api/")) {
            try {
              const urlInfo = await apiClient.get<{ data: { downloadUrl: string } }>(
                `/api/resources/${resource.id}/download-url`
              );
              if (urlInfo.data?.data?.downloadUrl) {
                targetUrl = urlInfo.data.data.downloadUrl;
              }
            } catch {
              // fallback
            }
          }
        }

        if (!targetUrl || targetUrl === "#") {
          throw new Error("No preview or download URL available for this resource.");
        }

        // Detect type based on extension, format, or converted status
        const ext = extension;
        const isPdf = ext === "pdf" || resource.format === "pdf" || isConvertedPreview || targetUrl.endsWith(".pdf");
        const isDocx = ext === "docx" || ext === "doc";
        const isPptx = ext === "pptx" || ext === "ppt" || resource.format === "pptx";
        const isXlsx = ext === "xlsx" || ext === "xls" || ext === "csv";
        const isIpynb = ext === "ipynb" || resource.format === "ipynb";
        const isImg = ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"].includes(ext);
        const isMedia = ["mp4", "webm", "ogg", "mp3", "wav"].includes(ext);
        const isZip = ["zip", "tar", "gz", "7z", "rar"].includes(ext) || resource.format === "zip";
        const isCodeText = [
          "txt", "md", "cpp", "c", "h", "hpp", "java", "py", "js", "jsx", "ts", "tsx",
          "json", "html", "css", "sql", "sh", "bat", "rs", "go", "php", "rb", "xml", "yaml", "yml"
        ].includes(ext);

        // Fast path for PDFs: use authenticated HTTP Range streaming via PDF.js without downloading entire ArrayBuffer
        if (isPdf && !pdfArrayBuffer) {
          setContentType("pdf");
          const token = tokenService.get();
          setAuthToken(token);
          setPdfUrl(targetUrl);
          pdfUrlRef.current = targetUrl;
          loadedResourceIdRef.current = resource.id;
          if (isMounted) setLoading(false);
          return;
        }

        // Fetch ArrayBuffer for client-side parsers (or fallback mode)
        if (isPdf || isDocx || isPptx || isXlsx || isIpynb || isCodeText || isZip) {
          const isExternal =
            (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) &&
            (typeof window === "undefined" || !targetUrl.includes(window.location.host));
          const response = isExternal
            ? await axios.get(targetUrl, { responseType: "arraybuffer" })
            : await apiClient.get(targetUrl, { responseType: "arraybuffer" });
          const arrayBuffer = response.data as ArrayBuffer;

          if (!isMounted) return;

          if (isPdf) {
            setContentType("pdf");
            setPdfArrayBuffer(arrayBuffer);
            const blob = new Blob([arrayBuffer], { type: "application/pdf" });
            createdObjectUrl = URL.createObjectURL(blob);
            setFileBlobUrl(createdObjectUrl);
          } else if (isDocx) {
            setContentType("docx");
            try {
              const res = await mammoth.convertToHtml({ arrayBuffer });
              const html = res.value || "<p>Document contained no renderable text.</p>";
              
              // Basic sanitize: strip script tags
              const sanitizedHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
              setDocxHtml(sanitizedHtml);

              // Calculate basic word count
              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = sanitizedHtml;
              const plainText = tempDiv.textContent || "";
              const words = plainText.trim().split(/\s+/).filter(Boolean).length;
              const paras = tempDiv.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li").length;
              setDocxTextCount({ words, paras });
            } catch (err: any) {
              throw new Error(`Failed to parse DOCX file: ${err.message || "Invalid structure"}`);
            }
          } else if (isPptx) {
            setContentType("pptx");
            try {
              const zip = await JSZip.loadAsync(arrayBuffer);
              const slideFiles: string[] = [];

              zip.forEach((relativePath) => {
                if (relativePath.match(/^ppt\/slides\/slide\d+\.xml$/i)) {
                  slideFiles.push(relativePath);
                }
              });

              // Sort slideFiles by slide number
              slideFiles.sort((a, b) => {
                const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
                const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
                return numA - numB;
              });

              if (slideFiles.length === 0) {
                // Check if any text can be extracted from zip
                setSlides([{
                  slideNumber: 1,
                  title: resource.title,
                  texts: ["Presentation contains no standard XML slides or is compressed."],
                  images: [],
                  tables: []
                }]);
              } else {
                const parsedSlidesList: ParsedSlide[] = [];

                for (let i = 0; i < slideFiles.length; i++) {
                  const slidePath = slideFiles[i];
                  const xmlStr = await zip.file(slidePath)?.async("text");
                  if (!xmlStr) continue;

                  const parser = new DOMParser();
                  const xmlDoc = parser.parseFromString(xmlStr, "application/xml");

                  // Parse shapes spatially to prevent footers or out-of-order shapes appearing as title
                  const shapeElements = Array.from(xmlDoc.querySelectorAll("p\\:sp, sp"));
                  interface ShapeData {
                    y: number;
                    isTitle: boolean;
                    isFooter: boolean;
                    text: string;
                  }

                  const extractedShapes: ShapeData[] = [];

                  for (const sp of shapeElements) {
                    const offElem = sp.querySelector("a\\:off, off");
                    const y = offElem ? parseInt(offElem.getAttribute("y") || "0", 10) : 0;

                    const phElem = sp.querySelector("p\\:ph, ph");
                    const phType = phElem ? (phElem.getAttribute("type") || "body").toLowerCase() : "";
                    const isTitle = phType === "title" || phType === "ctrtitle" || phType === "subttl";
                    const isFooter = phType === "ftr" || phType === "sldnum" || phType === "dt";

                    const tNodes = Array.from(sp.querySelectorAll("a\\:t, t"));
                    const text = tNodes.map((t) => t.textContent?.trim() || "").filter(Boolean).join(" ");
                    if (text) {
                      extractedShapes.push({ y, isTitle, isFooter, text });
                    }
                  }

                  // Sort shapes top-to-bottom by vertical position
                  extractedShapes.sort((a, b) => a.y - b.y);

                  let titleText = "";
                  const bodyTexts: string[] = [];

                  const explicitTitle = extractedShapes.find((s) => s.isTitle && s.text);
                  if (explicitTitle) {
                    titleText = explicitTitle.text;
                    for (const s of extractedShapes) {
                      if (s !== explicitTitle && !s.isFooter) {
                        bodyTexts.push(s.text);
                      }
                    }
                  } else if (extractedShapes.length > 0) {
                    const nonFooter = extractedShapes.filter((s) => !s.isFooter);
                    if (nonFooter.length > 0) {
                      titleText = nonFooter[0].text;
                      bodyTexts.push(...nonFooter.slice(1).map((s) => s.text));
                    } else {
                      titleText = extractedShapes[0].text;
                      bodyTexts.push(...extractedShapes.slice(1).map((s) => s.text));
                    }
                  } else {
                    const textNodes = Array.from(xmlDoc.getElementsByTagName("a:t"));
                    const texts = textNodes.map((n) => n.textContent?.trim() || "").filter(Boolean);
                    titleText = texts[0] || `Slide ${i + 1}`;
                    if (texts.length > 1) bodyTexts.push(...texts.slice(1));
                  }

                  parsedSlidesList.push({
                    slideNumber: i + 1,
                    title: titleText || `Slide ${i + 1}`,
                    texts: bodyTexts.length > 0 ? bodyTexts : [titleText],
                    images: [],
                    tables: []
                  });
                }

                setSlides(parsedSlidesList);
                setCurrentSlideIndex(0);
              }
            } catch (err: any) {
              throw new Error(`Failed to extract PPTX presentation slides: ${err.message}`);
            }
          } else if (isXlsx) {
            setContentType("xlsx");
            try {
              const workbook = XLSX.read(arrayBuffer, { type: "array" });
              const names = workbook.SheetNames || [];
              setSheetNames(names);

              if (names.length > 0) {
                const htmlMap: Record<string, string> = {};
                for (const name of names) {
                  const sheet = workbook.Sheets[name];
                  htmlMap[name] = XLSX.utils.sheet_to_html(sheet, { header: "", footer: "" });
                }
                setSheetHtmlMap(htmlMap);
                setActiveSheet(names[0]);
              }
            } catch (err: any) {
              throw new Error(`Failed to parse Excel spreadsheet: ${err.message}`);
            }
          } else if (isIpynb) {
            setContentType("ipynb");
            try {
              const decoder = new TextDecoder("utf-8");
              const text = decoder.decode(arrayBuffer);
              const nbJson = JSON.parse(text);
              setIpynbCells(nbJson.cells || []);
            } catch (err: any) {
              throw new Error(`Failed to parse Jupyter Notebook JSON: ${err.message}`);
            }
          } else if (isCodeText) {
            setContentType("code");
            const decoder = new TextDecoder("utf-8");
            const text = decoder.decode(arrayBuffer);
            setRawTextContent(text);

            // Prism syntax highlighting
            let lang = "javascript";
            if (["cpp", "c", "h", "hpp"].includes(ext)) lang = "cpp";
            else if (["java"].includes(ext)) lang = "java";
            else if (["py"].includes(ext)) lang = "python";
            else if (["ts", "tsx"].includes(ext)) lang = "typescript";
            else if (["html", "xml"].includes(ext)) lang = "markup";
            else if (["css"].includes(ext)) lang = "css";
            else if (["json"].includes(ext)) lang = "json";
            else if (["sql"].includes(ext)) lang = "sql";

            try {
              const grammar = Prism.languages[lang] || Prism.languages.javascript || Prism.languages.plain;
              const highlighted = Prism.highlight(text, grammar, lang);
              setSyntaxHighlightedHtml(highlighted);
            } catch {
              setSyntaxHighlightedHtml(escapeHtml(text));
            }
          } else if (isZip) {
            setContentType("zip");
            try {
              const zip = await JSZip.loadAsync(arrayBuffer);
              const entries: ZipEntry[] = [];
              zip.forEach((relPath, fileObj) => {
                entries.push({
                  name: relPath,
                  size: (fileObj as any)._data?.uncompressedSize || 0,
                  isDir: fileObj.dir,
                  date: fileObj.date
                });
              });
              setZipEntries(entries);
            } catch (err: any) {
              throw new Error(`Failed to read ZIP archive: ${err.message}`);
            }
          }
        } else if (isImg) {
          setContentType("image");
          setFileBlobUrl(targetUrl);
        } else if (isMedia) {
          setContentType("media");
          setFileBlobUrl(targetUrl);
        } else {
          setContentType("unsupported");
        }
        loadedResourceIdRef.current = resource.id;
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load document preview content.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDocument();

    return () => {
      isMounted = false;
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [resource.id, resource.fileUrl, extension]);

  const handleCopyCode = () => {
    if (rawTextContent) {
      navigator.clipboard.writeText(rawTextContent);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // ── Render Loading State ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 dark:text-slate-400 min-h-[350px]">
        <Loader2 size={36} className="animate-spin text-[#1E90FF] mb-3" />
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Loading Document Preview...
        </h4>
        <p className="text-xs text-slate-400 mt-1">
          Parsing {resource.title} ({resource.fileSize})
        </p>
      </div>
    );
  }

  // ── Render Error State ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-600 dark:text-slate-400 min-h-[300px]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 mb-3">
          <AlertCircle size={24} />
        </div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
          Unable to Render Preview
        </h4>
        <p className="text-xs text-rose-500/90 dark:text-rose-400/90 max-w-md mb-4 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50">
          {error}
        </p>
        <p className="text-xs text-slate-500 mb-4">
          You can still download the original file to view it on your local device.
        </p>
        <button
          onClick={() => onDownload(resource)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E90FF] text-white text-xs font-bold hover:bg-[#187bcd] transition-colors"
        >
          <Download size={14} />
          <span>Download Original File</span>
        </button>
      </div>
    );
  }

  // ── Render PDF / Paginated DOCX / Slide PPTX Stream ───────────────────────
  if (contentType === "pdf") {
    if (pdfArrayBuffer || pdfUrl) {
      return (
        <PdfDocumentViewer
          pdfUrl={pdfUrl}
          authToken={authToken}
          arrayBuffer={pdfArrayBuffer}
          fitMode={fitMode || "page"}
          zoomLevel={zoomLevel}
          isPptx={extension === "pptx" || extension === "ppt" || resource.format === "pptx"}
          targetPage={targetPage}
          searchQuery={searchQuery}
          activeMatchIndex={activeMatchIndex}
          navigationTick={navigationTick}
          onPageChange={onPageChange}
          onSearchResultsChange={onSearchResultsChange}
          onErrorFallback={handlePdfFallback}
        />
      );
    } else if (fileBlobUrl) {
      const cleanPdfUrl = `${fileBlobUrl}#toolbar=0&navpanes=0&statusbar=0&view=FitH`;
      return (
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
          className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-white transition-transform"
        >
          <iframe
            src={cleanPdfUrl}
            title={resource.title}
            className="w-full h-full border-none"
          />
        </div>
      );
    }
  }

  // ── Render DOCX ────────────────────────────────────────────────────────────
  if (contentType === "docx" && docxHtml) {
    const isFitWidth = fitMode === "width";

    return (
      <div
        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
        className={`w-full bg-white dark:bg-[#0F1A30] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 shadow-2xl transition-all duration-200 mx-auto my-4 ${
          isFitWidth ? "max-w-5xl" : "max-w-3xl"
        }`}
      >
        {docxTextCount && (
          <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-[#1E90FF]" />
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Word Document View
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span>{docxTextCount.words} words</span>
              <span>•</span>
              <span>{docxTextCount.paras} sections/paragraphs</span>
            </div>
          </div>
        )}

        <div
          className="prose dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200
            [&_h1]:text-xl [&_h1]:font-extrabold [&_h1]:text-slate-900 dark:[&_h1]:text-slate-50 [&_h1]:mt-6 [&_h1]:mb-3
            [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-800 dark:[&_h2]:text-slate-100 [&_h2]:mt-5 [&_h2]:mb-2
            [&_h3]:text-base [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2
            [&_p]:mb-3 [&_p]:leading-relaxed
            [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
            [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_td]:border [&_td]:border-slate-300 dark:[&_td]:border-slate-700 [&_td]:p-2.5 [&_th]:border [&_th]:border-slate-300 dark:[&_th]:border-slate-700 [&_th]:p-2.5 [&_th]:bg-slate-100 dark:[&_th]:bg-slate-800
            [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:my-3
          "
          dangerouslySetInnerHTML={{ __html: docxHtml }}
        />
      </div>
    );
  }

  // ── Render PPTX ────────────────────────────────────────────────────────────
  if (contentType === "pptx") {
    const currentSlide = slides[currentSlideIndex];

    return (
      <div className="w-full flex flex-col md:flex-row gap-4 h-[65vh]">
        {/* Slide Selection Sidebar */}
        <div className="w-full md:w-56 shrink-0 bg-white dark:bg-[#0F1A30] rounded-2xl border border-slate-200 dark:border-slate-800 p-3 overflow-y-auto flex flex-row md:flex-col gap-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 hidden md:block">
            Slides ({slides.length})
          </div>
          {slides.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlideIndex(idx)}
              className={`p-2.5 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                idx === currentSlideIndex
                  ? "border-[#1E90FF] bg-[#1E90FF]/10 font-bold text-[#1E90FF]"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              <div className="text-[10px] opacity-75">Slide {s.slideNumber}</div>
              <div className="truncate font-semibold text-[11px]">{s.title || `Slide ${s.slideNumber}`}</div>
            </button>
          ))}
        </div>

        {/* Slide Main Presentation Display */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#0F1A30] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
          {/* Slide Navigation Header */}
          <div className="h-10 shrink-0 px-4 bg-slate-50 dark:bg-[#080D1A] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span className="font-bold flex items-center gap-1.5">
              <Presentation size={14} className="text-orange-500" />
              <span>Slide {currentSlideIndex + 1} of {slides.length}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex((i) => Math.max(0, i - 1))}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={currentSlideIndex >= slides.length - 1}
                onClick={() => setCurrentSlideIndex((i) => Math.min(slides.length - 1, i + 1))}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Slide Canvas Content */}
          <div className="flex-1 overflow-auto p-6 bg-slate-100 dark:bg-[#080D1A]/60 flex items-center justify-center">
            {currentSlide ? (
              <div
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "center center" }}
                className="w-full max-w-2xl min-h-[320px] bg-white dark:bg-[#0F1A30] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-2xl flex flex-col justify-between transition-transform"
              >
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-50 pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                    {currentSlide.title}
                  </h3>

                  <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {currentSlide.texts.map((txt, tIdx) => (
                      <div key={tIdx} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#1E90FF] mt-1.5 shrink-0" />
                        <span className="whitespace-pre-wrap">{txt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{resource.subjectCode} • Presentation Slide</span>
                  <span>{currentSlideIndex + 1} / {slides.length}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">No slide content available.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Render XLSX / Excel Spreadsheets ───────────────────────────────────────
  if (contentType === "xlsx") {
    const currentHtml = sheetHtmlMap[activeSheet] || "";

    return (
      <div
        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
        className="w-full max-w-4xl bg-white dark:bg-[#0F1A30] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xl transition-transform"
      >
        {/* Worksheet Tabs */}
        <div className="flex items-center gap-1.5 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <Table size={16} className="text-emerald-500 mr-2 shrink-0" />
          {sheetNames.map((name) => (
            <button
              key={name}
              onClick={() => setActiveSheet(name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                activeSheet === name
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Spreadsheet HTML Grid Table */}
        <div
          className="overflow-auto max-h-[55vh] rounded-xl border border-slate-200 dark:border-slate-800 text-xs
            [&_table]:w-full [&_table]:border-collapse [&_table]:text-left
            [&_td]:border [&_td]:border-slate-200 dark:[&_td]:border-slate-800 [&_td]:p-2 [&_td]:min-w-[80px] [&_td]:text-slate-800 dark:[&_td]:text-slate-200
            [&_tr:hover]:bg-slate-50 dark:[&_tr:hover]:bg-slate-800/50
            [&_th]:bg-slate-100 dark:[&_th]:bg-slate-800 [&_th]:border [&_th]:border-slate-200 dark:[&_th]:border-slate-700 [&_th]:p-2 [&_th]:font-bold [&_th]:text-slate-700 dark:[&_th]:text-slate-300
          "
          dangerouslySetInnerHTML={{ __html: currentHtml }}
        />
      </div>
    );
  }

  // ── Render Jupyter Notebook (.ipynb) ───────────────────────────────────────
  if (contentType === "ipynb") {
    return (
      <div
        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
        className="w-full max-w-3xl bg-white dark:bg-[#0F1A30] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 transition-transform"
      >
        <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <FileCode size={16} className="text-[#1E90FF]" />
            <span>Jupyter Notebook ({ipynbCells.length} cells)</span>
          </div>
        </div>

        {ipynbCells.map((cell, idx) => {
          const srcText = Array.isArray(cell.source) ? cell.source.join("") : cell.source || "";

          return (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-[#080D1A]/50"
            >
              {/* Cell Header */}
              <div className="px-3 py-1.5 bg-slate-100 dark:bg-[#162544] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>[{cell.cell_type.toUpperCase()}] In [{idx + 1}]:</span>
              </div>

              {/* Cell Code or Markdown */}
              {cell.cell_type === "code" ? (
                <pre className="p-3 text-xs font-mono overflow-x-auto text-slate-800 dark:text-slate-200 bg-[#080D1A] text-slate-100">
                  <code>{srcText}</code>
                </pre>
              ) : (
                <div className="p-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {srcText}
                </div>
              )}

              {/* Cell Outputs */}
              {cell.outputs && cell.outputs.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-[#0F1A30] text-xs font-mono">
                  {cell.outputs.map((out, oIdx) => {
                    const outText = Array.isArray(out.text) ? out.text.join("") : out.text || "";
                    const imgData = out.data?.["image/png"] || out.data?.["image/jpeg"];

                    return (
                      <div key={oIdx} className="space-y-2">
                        {outText && (
                          <pre className="text-slate-600 dark:text-slate-400 text-[11px] whitespace-pre-wrap">
                            {outText}
                          </pre>
                        )}
                        {imgData && (
                          <img
                            src={`data:image/png;base64,${imgData}`}
                            alt={`Cell ${idx} plot output`}
                            className="max-w-full h-auto rounded-xl border border-slate-200 dark:border-slate-800 my-2"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Render Source Code / Text Files ────────────────────────────────────────
  if (contentType === "code") {
    return (
      <div
        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
        className="w-full max-w-3xl bg-[#080D1A] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl transition-transform"
      >
        {/* Code Header Bar */}
        <div className="px-4 py-2 bg-[#0F1A30] border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2 font-mono">
            <FileCode size={14} className="text-[#1E90FF]" />
            <span className="font-bold">{resource.title}</span>
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 transition-colors"
          >
            {copiedCode ? (
              <>
                <Check size={12} className="text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        {/* Code View Canvas */}
        <div className="p-4 overflow-auto max-h-[60vh] font-mono text-xs leading-relaxed text-slate-200">
          <pre dangerouslySetInnerHTML={{ __html: syntaxHighlightedHtml || escapeHtml(rawTextContent) }} />
        </div>
      </div>
    );
  }

  // ── Render Images ──────────────────────────────────────────────────────────
  if (contentType === "image" && fileBlobUrl) {
    return (
      <div
        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "center center" }}
        className="flex items-center justify-center max-w-4xl max-h-[65vh] p-4 transition-transform"
      >
        <img
          src={fileBlobUrl}
          alt={resource.title}
          className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800"
        />
      </div>
    );
  }

  // ── Render Audio / Video Media ─────────────────────────────────────────────
  if (contentType === "media" && fileBlobUrl) {
    const isVideo = ["mp4", "webm", "ogg"].includes(extension);

    return (
      <div className="w-full max-w-2xl bg-black rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col items-center">
        {isVideo ? (
          <video controls src={fileBlobUrl} className="w-full max-h-[55vh] rounded-xl" />
        ) : (
          <audio controls src={fileBlobUrl} className="w-full my-4" />
        )}
      </div>
    );
  }

  // ── Render ZIP Archives ────────────────────────────────────────────────────
  if (contentType === "zip") {
    return (
      <div
        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
        className="w-full max-w-2xl bg-white dark:bg-[#0F1A30] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl transition-transform"
      >
        <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <Archive size={16} className="text-amber-500" />
            <span>Archive File Directory ({zipEntries.length} items)</span>
          </div>
        </div>

        <div className="overflow-auto max-h-[50vh] mt-3 space-y-1 text-xs">
          {zipEntries.map((e, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#080D1A] border border-slate-200/60 dark:border-slate-800/60"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText size={13} className={e.isDir ? "text-amber-500" : "text-[#1E90FF]"} />
                <span className="font-mono text-slate-800 dark:text-slate-200 truncate">{e.name}</span>
              </div>
              <span className="text-[10px] text-slate-400 tabular-nums">
                {e.isDir ? "DIR" : `${(e.size / 1024).toFixed(1)} KB`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Fallback / Unsupported View ────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400 min-h-[300px]">
      <Info size={36} className="text-[#1E90FF] mb-3" />
      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
        Preview Not Available For This Extension (.{extension})
      </h4>
      <p className="text-xs text-slate-400 max-w-sm mb-4">
        You can download the original resource to open it in your local software.
      </p>
      <button
        onClick={() => onDownload(resource)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E90FF] text-white text-xs font-bold hover:bg-[#187bcd] transition-colors"
      >
        <Download size={14} />
        <span>Download File ({resource.fileSize})</span>
      </button>
    </div>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
