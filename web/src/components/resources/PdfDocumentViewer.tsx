import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ChevronLeft, ChevronRight, Presentation, Loader2, RotateCw } from "lucide-react";

// Polyfill ECMAScript features required by PDF.js (v6.4.299)
if (typeof Map !== "undefined" && !(Map.prototype as any).getOrInsertComputed) {
  (Map.prototype as any).getOrInsertComputed = function (key: any, callback: () => any) {
    if (this.has(key)) return this.get(key);
    const val = callback();
    this.set(key, val);
    return val;
  };
}

if (typeof Uint8Array !== "undefined" && !(Uint8Array.prototype as any).toHex) {
  (Uint8Array.prototype as any).toHex = function () {
    return Array.from(this as any).map((b: any) => Number(b).toString(16).padStart(2, "0")).join("");
  };
}

if (typeof Math !== "undefined" && !(Math as any).sumPrecise) {
  (Math as any).sumPrecise = function (iterable: Iterable<number>) {
    let sum = 0;
    for (const n of iterable) sum += n;
    return sum;
  };
}

if (typeof Promise !== "undefined" && !(Promise as any).withResolvers) {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Set PDF.js worker source to polyfilled worker
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";
} else {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface SearchMatch {
  id: string;
  pageNumber: number;
  snippet: string;
  matchText: string;
  isHeading?: boolean;
  headingTitle?: string;
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
    xPct?: number;
    yPct?: number;
    widthPct?: number;
    heightPct?: number;
  };
}

interface PdfDocumentViewerProps {
  arrayBuffer?: ArrayBuffer | null;
  pdfUrl?: string | null;
  authToken?: string | null;
  fitMode: "page" | "width";
  zoomLevel: number;
  isPptx: boolean;
  targetPage?: number;
  searchQuery?: string;
  activeMatchIndex?: number;
  navigationTick?: number;
  onPageChange?: (currentPage: number, totalPages: number) => void;
  onSearchResultsChange?: (results: { total: number; matches: SearchMatch[]; isSearching?: boolean }) => void;
  onErrorFallback?: () => void;
}

export function getPageScaleAndDimensions(
  unscaledWidth: number,
  unscaledHeight: number,
  fitMode: "page" | "width",
  zoomLevel: number,
  containerWidth: number,
  containerHeight: number
) {
  let baseScale = (zoomLevel / 100) * 1.3;
  const availW = containerWidth || 800;
  const availH = containerHeight || 600;
  const availableWidth = Math.max(200, availW - 32);
  const availableHeight = Math.max(200, availH - 56);

  if (fitMode === "width" && unscaledWidth > 0) {
    baseScale = (availableWidth / unscaledWidth) * (zoomLevel / 100);
  } else if (fitMode === "page" && unscaledWidth > 0 && unscaledHeight > 0) {
    const scaleW = availableWidth / unscaledWidth;
    const scaleH = availableHeight / unscaledHeight;
    baseScale = Math.min(scaleW, scaleH) * (zoomLevel / 100);
  }

  if (!baseScale || isNaN(baseScale) || baseScale <= 0) {
    baseScale = 1.0;
  }

  const width = Math.floor(unscaledWidth * baseScale);
  const height = Math.floor(unscaledHeight * baseScale);
  return { scale: baseScale, width, height };
}

export function PdfDocumentViewer({
  arrayBuffer,
  pdfUrl,
  authToken,
  fitMode,
  zoomLevel,
  isPptx,
  targetPage,
  searchQuery,
  activeMatchIndex = 0,
  navigationTick,
  onPageChange,
  onSearchResultsChange,
  onErrorFallback
}: PdfDocumentViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

interface CachedPageText {
  pageStr: string;
  charMap: Array<{ item: any }>;
  viewport?: any;
}

  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const renderedPagesRef = useRef<Set<number>>(new Set());
  const [failedPages, setFailedPages] = useState<Map<number, string>>(new Map());
  const [allMatches, setAllMatches] = useState<SearchMatch[]>([]);
  const pageTextCacheRef = useRef<Map<number, CachedPageText>>(new Map());
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery || "");
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const activeRenderTasks = useRef<Map<number, pdfjsLib.RenderTask>>(new Map());

  // Navigation lock and dimensions
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const scrollLockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTargetPageRef = useRef<number | null>(null);
  const pendingMatchYPctRef = useRef<number | undefined>(undefined);
  const targetScrollTopRef = useRef<number | null>(null);

  const lastHandledTargetPageRef = useRef<number | null>(null);
  const lastHandledNavTickRef = useRef<number | null>(null);
  const lastHandledMatchIdxRef = useRef<number | null>(null);

  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [pageDimensions, setPageDimensions] = useState<Map<number, { width: number; height: number }>>(new Map());
  const slideAreaRef = useRef<HTMLDivElement | null>(null);
  const lastRenderedPptxPageRef = useRef<number | null>(null);
  const slideCanvasCacheRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const [activeSlideDims, setActiveSlideDims] = useState<{ width: number; height: number } | null>(null);

  // Cached page proxies to avoid redundant PDF.js worker communication & deserialization
  const pagePromiseCache = useRef<Map<number, Promise<pdfjsLib.PDFPageProxy>>>(new Map());
  const renderedPageScales = useRef<Map<number, string>>(new Map());

  const getCachedPage = useCallback((pageNum: number): Promise<pdfjsLib.PDFPageProxy> | null => {
    if (!pdfDoc) return null;
    if (!pagePromiseCache.current.has(pageNum)) {
      pagePromiseCache.current.set(pageNum, pdfDoc.getPage(pageNum));
    }
    return pagePromiseCache.current.get(pageNum)!;
  }, [pdfDoc]);

  const prevFitModeRef = useRef(fitMode);
  const prevZoomLevelRef = useRef(zoomLevel);
  const prevLayoutStateRef = useRef({
    width: 0,
    height: 0,
    fitMode,
    zoomLevel
  });

  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const onPageChangeRef = useRef(onPageChange);
  const onSearchResultsChangeRef = useRef(onSearchResultsChange);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  useEffect(() => {
    onSearchResultsChangeRef.current = onSearchResultsChange;
  }, [onSearchResultsChange]);

  // Container ResizeObserver for responsive scale recalculation
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerDimensions((prev) => {
          if (Math.abs(prev.width - width) > 2 || Math.abs(prev.height - height) > 2) {
            return { width: Math.floor(width), height: Math.floor(height) };
          }
          return prev;
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 1. Load PDF Document (supports HTTP Range Streaming via pdfUrl or raw ArrayBuffer)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    let loadingTask: pdfjsLib.PDFDocumentLoadingTask;

    if (pdfUrl) {
      const isExternalCloud =
        (pdfUrl.startsWith("http://") || pdfUrl.startsWith("https://")) &&
        (typeof window === "undefined" || !pdfUrl.includes(window.location.host));
      const headers: Record<string, string> = {};
      if (authToken && !isExternalCloud) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      loadingTask = pdfjsLib.getDocument({
        url: pdfUrl,
        httpHeaders: headers,
        withCredentials: !isExternalCloud,
        rangeChunkSize: 262144,
        disableAutoFetch: true,
        disableStream: true,
        cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/standard_fonts/`
      });
    } else if (arrayBuffer) {
      loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/standard_fonts/`
      });
    } else {
      setLoading(false);
      return;
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Document loading timed out after 12 seconds")), 12000);
    });

    Promise.race([loadingTask.promise, timeoutPromise])
      .then((doc) => {
        if (!isMounted) return;
        pagePromiseCache.current.clear();
        renderedPageScales.current.clear();
        pageTextCacheRef.current.clear();
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        if (pdfUrl && onErrorFallback) {
          console.warn("[PdfDocumentViewer] PDF range streaming failed or timed out, falling back to ArrayBuffer:", err);
          onErrorFallback();
        } else {
          setError(err?.message || "Failed to parse PDF document.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      try {
        loadingTask.destroy();
      } catch {}
    };
  }, [pdfUrl, arrayBuffer, authToken, onErrorFallback]);

  // Cache per-page unscaled viewports for aspect ratio preservation & static layout calculation
  useEffect(() => {
    if (!pdfDoc) return;
    let isMounted = true;
    async function fetchDims() {
      try {
        const numPages = pdfDoc!.numPages;
        // Step 1: Immediately set instant baseline dimensions for all page placeholders to eliminate layout delays
        const defaultDims = { width: 595, height: 842 };
        const initialDimsMap = new Map<number, { width: number; height: number }>();
        for (let i = 1; i <= numPages; i++) {
          initialDimsMap.set(i, defaultDims);
        }
        if (isMounted) setPageDimensions(initialDimsMap);

        // Step 2: Fetch page 1's real viewport asynchronously to refine exact aspect ratio
        const page1Promise = getCachedPage(1);
        if (!page1Promise) return;
        const page1 = await page1Promise;
        if (!isMounted) return;
        const vp1 = page1.getViewport({ scale: 1.0 });
        const realDims = { width: vp1.width, height: vp1.height };

        const refinedDimsMap = new Map<number, { width: number; height: number }>();
        for (let i = 1; i <= numPages; i++) {
          refinedDimsMap.set(i, realDims);
        }
        if (isMounted) setPageDimensions(refinedDimsMap);
      } catch (err) {
        console.warn("[PdfDocumentViewer] Error fetching page dimensions:", err);
      }
    }
    fetchDims();
    return () => {
      isMounted = false;
    };
  }, [pdfDoc, getCachedPage]);

  // Scroll to target page with match position offset & lock to prevent scroll-tracking flickering
  const scrollToPage = useCallback(
    (pageNum: number, matchYPct?: number, behavior: ScrollBehavior = "smooth") => {
      if (pageNum < 1 || pageNum > totalPages) return;

      isProgrammaticScrollRef.current = true;
      pendingTargetPageRef.current = pageNum;
      pendingMatchYPctRef.current = matchYPct;
      setCurrentPage(pageNum);

      const isDistantJump = Math.abs(currentPageRef.current - pageNum) > 2;
      const effectiveBehavior = isDistantJump ? "auto" : behavior;

      const targetElement = pageRefs.current.get(pageNum);
      if (targetElement && containerRef.current) {
        const pageDim = pageDimensions.get(pageNum);
        let extraY = 0;
        if (typeof matchYPct === "number" && matchYPct > 0) {
          const elHeight = targetElement.clientHeight || (pageDim ? pageDim.height : 600);
          extraY = Math.max(0, Math.floor((elHeight * matchYPct) / 100) - 60);
        }

        const maxScrollTop = Math.max(0, containerRef.current.scrollHeight - containerRef.current.clientHeight);
        const desiredScrollTop = Math.max(0, targetElement.offsetTop + extraY - 12);
        const targetScrollTop = Math.min(desiredScrollTop, maxScrollTop);
        targetScrollTopRef.current = targetScrollTop;

        containerRef.current.scrollTo({
          top: targetScrollTop,
          behavior: effectiveBehavior
        });
      }

      if (scrollLockTimeoutRef.current) {
        clearTimeout(scrollLockTimeoutRef.current);
      }
      const lockDuration = isDistantJump ? 300 : 800;
      scrollLockTimeoutRef.current = setTimeout(() => {
        isProgrammaticScrollRef.current = false;
        pendingTargetPageRef.current = null;
        pendingMatchYPctRef.current = undefined;
        targetScrollTopRef.current = null;
      }, lockDuration);
    },
    [totalPages, pageDimensions]
  );

  // 2. Scroll to target page when targetPage, activeMatchIndex, or navigationTick changes (guarded to prevent feedback loops)
  useEffect(() => {
    if (!targetPage || targetPage < 1 || targetPage > totalPages) return;

    const isNewTick = navigationTick !== undefined && lastHandledNavTickRef.current !== navigationTick;
    const isNewMatch = activeMatchIndex !== undefined && lastHandledMatchIdxRef.current !== activeMatchIndex;
    const isInitialMount = lastHandledNavTickRef.current === null;
    const isExplicitTargetChange = lastHandledTargetPageRef.current !== targetPage && (isNewTick || isNewMatch || isInitialMount);

    if (isExplicitTargetChange || isNewTick || isNewMatch) {
      lastHandledTargetPageRef.current = targetPage;
      lastHandledNavTickRef.current = navigationTick ?? null;
      lastHandledMatchIdxRef.current = activeMatchIndex ?? null;

      if (!isPptx) {
        const activeMatch = allMatches[activeMatchIndex];
        const matchYPct = activeMatch && activeMatch.pageNumber === targetPage ? activeMatch.rect?.yPct : undefined;
        scrollToPage(targetPage, matchYPct, "smooth");
      } else {
        setCurrentPage(targetPage);
      }
    }
  }, [targetPage, activeMatchIndex, navigationTick, totalPages, isPptx, allMatches, scrollToPage]);

  // 2b. Re-scroll to active page when container dimensions, fitMode, or zoomLevel changes to preserve visible page across scale and fullscreen switches
  useEffect(() => {
    const prev = prevLayoutStateRef.current;
    const isChanged =
      prev.width !== containerDimensions.width ||
      prev.height !== containerDimensions.height ||
      prev.fitMode !== fitMode ||
      prev.zoomLevel !== zoomLevel;

    prevLayoutStateRef.current = {
      width: containerDimensions.width,
      height: containerDimensions.height,
      fitMode,
      zoomLevel
    };

    if (isChanged && containerDimensions.width > 0 && containerDimensions.height > 0 && !isPptx && totalPages > 0) {
      const activePage = pendingTargetPageRef.current ?? currentPageRef.current;
      if (activePage >= 1 && activePage <= totalPages) {
        requestAnimationFrame(() => {
          scrollToPage(activePage, undefined, "auto");
        });
      }
    }
  }, [containerDimensions, fitMode, zoomLevel, isPptx, totalPages, scrollToPage]);

  // Visible pages tracking via IntersectionObserver
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));

  useEffect(() => {
    if (!containerRef.current || totalPages === 0 || isPptx) return;
    if (typeof IntersectionObserver === "undefined") return;

    const container = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prev) => {
          let changed = false;
          const next = new Set(prev);
          for (const entry of entries) {
            const numAttr = entry.target.getAttribute("data-page-number");
            const pageNum = numAttr ? parseInt(numAttr, 10) : 0;
            if (!pageNum) continue;
            if (entry.isIntersecting) {
              if (!next.has(pageNum)) {
                next.add(pageNum);
                changed = true;
              }
            } else {
              if (next.has(pageNum)) {
                next.delete(pageNum);
                changed = true;
              }
            }
          }
          return changed ? next : prev;
        });
      },
      {
        root: container,
        rootMargin: "800px 0px 800px 0px",
        threshold: 0.01
      }
    );

    pageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [totalPages, isPptx]);

  // Set of pages that should be rendered: visible pages + current active page + buffer
  const pagesToRender = useMemo(() => {
    const set = new Set<number>();
    if (totalPages === 0) return set;
    if (isPptx) {
      set.add(currentPage);
      return set;
    }

    // Always include currentPage and adjacent buffer (2 pages in each direction)
    set.add(currentPage);
    if (currentPage > 1) set.add(currentPage - 1);
    if (currentPage > 2) set.add(currentPage - 2);
    if (currentPage < totalPages) set.add(currentPage + 1);
    if (currentPage < totalPages - 1) set.add(currentPage + 2);

    // Include visible pages and adjacent buffer
    visiblePages.forEach((p) => {
      if (p >= 1 && p <= totalPages) {
        set.add(p);
        if (p > 1) set.add(p - 1);
        if (p > 2) set.add(p - 2);
        if (p < totalPages) set.add(p + 1);
        if (p < totalPages - 1) set.add(p + 2);
      }
    });

    return set;
  }, [totalPages, isPptx, currentPage, visiblePages]);

  // Cancel active render tasks when scale changes so tasks at the new scale execute without delay
  const prevScaleRef = useRef({ fitMode, zoomLevel, width: 0 });
  useEffect(() => {
    const prev = prevScaleRef.current;
    const isScaleChanged = prev.fitMode !== fitMode || prev.zoomLevel !== zoomLevel;
    const isWidthChanged = containerDimensions.width > 0 && Math.abs(prev.width - containerDimensions.width) > 40;

    if (isScaleChanged || isWidthChanged) {
      prevScaleRef.current = { fitMode, zoomLevel, width: containerDimensions.width };
      activeRenderTasks.current.forEach((task) => {
        try {
          task.cancel();
        } catch {}
      });
      activeRenderTasks.current.clear();
      slideCanvasCacheRef.current.clear();
      // Preserve existing rendered canvases so they remain visible while the new scale renders offscreen.
    }
  }, [fitMode, zoomLevel, containerDimensions.width]);

  // 3. Render pages onto canvases reactively (virtualized: only render visible pages + buffer)
  useEffect(() => {
    if (!pdfDoc || loading) return;

    let isMounted = true;
    const availW = containerDimensions.width || containerRef.current?.clientWidth || 800;
    const availH = containerDimensions.height || containerRef.current?.clientHeight || 600;
    const currentScaleKey = `${fitMode}:${zoomLevel}:${Math.round(availW)}`;

    async function renderSinglePage(pageNum: number) {
      if (!pdfDoc || !isMounted) return;
      const canvas = canvasRefs.current.get(pageNum);
      if (!canvas) return;

      if (activeRenderTasks.current.has(pageNum)) {
        try {
          activeRenderTasks.current.get(pageNum)?.cancel();
        } catch {}
        activeRenderTasks.current.delete(pageNum);
      }

      try {
        const pagePromise = getCachedPage(pageNum);
        if (!pagePromise) return;
        const page = await pagePromise;
        if (!isMounted) return;

        const unscaledViewport = page.getViewport({ scale: 1.0 });

        // Update page dimensions dynamically if unscaled viewport differs from baseline
        const pageDim = pageDimensions.get(pageNum);
        if (!pageDim || Math.abs(pageDim.width - unscaledViewport.width) > 2 || Math.abs(pageDim.height - unscaledViewport.height) > 2) {
          setPageDimensions((prev) => {
            const next = new Map(prev);
            next.set(pageNum, { width: unscaledViewport.width, height: unscaledViewport.height });
            return next;
          });
        }

        let dims: { scale: number; width: number; height: number };
        if (isPptx) {
          const isMd = typeof window !== "undefined" && window.innerWidth >= 768;
          const areaW = slideAreaRef.current?.clientWidth
            ? Math.max(200, slideAreaRef.current.clientWidth - 48)
            : Math.max(200, availW - (isMd ? 256 : 0) - 48);
          const areaH = slideAreaRef.current?.clientHeight
            ? Math.max(200, slideAreaRef.current.clientHeight - 48)
            : Math.max(200, availH - 40 - 48);

          let baseScale = (zoomLevel / 100) * 1.3;
          if (fitMode === "width" && unscaledViewport.width > 0) {
            baseScale = (areaW / unscaledViewport.width) * (zoomLevel / 100);
          } else if (fitMode === "page" && unscaledViewport.width > 0 && unscaledViewport.height > 0) {
            const scaleW = areaW / unscaledViewport.width;
            const scaleH = areaH / unscaledViewport.height;
            baseScale = Math.min(scaleW, scaleH) * (zoomLevel / 100);
          }
          if (!baseScale || isNaN(baseScale) || baseScale <= 0) baseScale = 1.0;
          dims = {
            scale: baseScale,
            width: Math.floor(unscaledViewport.width * baseScale),
            height: Math.floor(unscaledViewport.height * baseScale)
          };
          setActiveSlideDims({ width: dims.width, height: dims.height });
        } else {
          dims = getPageScaleAndDimensions(
            unscaledViewport.width,
            unscaledViewport.height,
            fitMode,
            zoomLevel,
            availW,
            availH
          );
        }

        const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2.0);
        const rotation = (page.rotate || 0) % 360;
        const viewport = page.getViewport({ scale: dims.scale * dpr, rotation });

        // Offscreen canvas prevents visual flickering and blank frames while high-res rendering executes
        const offscreen = document.createElement("canvas");
        offscreen.width = Math.floor(dims.width * dpr);
        offscreen.height = Math.floor(dims.height * dpr);

        const offCtx = offscreen.getContext("2d");
        if (!offCtx) return;

        const renderTask = page.render({ canvasContext: offCtx, viewport } as any);
        activeRenderTasks.current.set(pageNum, renderTask);

        const renderTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Rendering page timed out")), 12000);
        });

        await Promise.race([renderTask.promise, renderTimeout]);

        if (!isMounted) return;

        // Synchronously transfer completed render to live DOM canvas
        canvas.width = offscreen.width;
        canvas.height = offscreen.height;
        canvas.style.width = `${dims.width}px`;
        canvas.style.height = `${dims.height}px`;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(offscreen, 0, 0);
        }

        if (isPptx) {
          lastRenderedPptxPageRef.current = pageNum;
          slideCanvasCacheRef.current.set(pageNum, offscreen);

          // Bound cache to 12 slides to keep memory footprint under 30MB
          if (slideCanvasCacheRef.current.size > 12) {
            let furthest = -1;
            let maxDist = -1;
            for (const k of slideCanvasCacheRef.current.keys()) {
              const dist = Math.abs(k - currentPage);
              if (dist > maxDist) {
                maxDist = dist;
                furthest = k;
              }
            }
            if (furthest !== -1) {
              slideCanvasCacheRef.current.delete(furthest);
            }
          }
        }

        renderedPagesRef.current.add(pageNum);
        renderedPageScales.current.set(pageNum, currentScaleKey);
        setRenderedPages((prev) => {
          if (prev.has(pageNum)) return prev;
          const next = new Set(prev);
          next.add(pageNum);
          return next;
        });
        setFailedPages((prev) => {
          if (!prev.has(pageNum)) return prev;
          const next = new Map(prev);
          next.delete(pageNum);
          return next;
        });
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException" && !err?.message?.includes("cancelled")) {
          if (isMounted) {
            setFailedPages((prev) => {
              if (prev.has(pageNum) && prev.get(pageNum) === (err?.message || "Page rendering failed")) return prev;
              const next = new Map(prev);
              next.set(pageNum, err?.message || "Page rendering failed");
              return next;
            });
          }
        }
      } finally {
        activeRenderTasks.current.delete(pageNum);
      }
    }

    async function prefetchPptxSlide(pageNum: number) {
      if (!pdfDoc || !isMounted || pageNum < 1 || pageNum > totalPages) return;
      if (slideCanvasCacheRef.current.has(pageNum) && renderedPageScales.current.get(pageNum) === currentScaleKey) {
        return;
      }
      try {
        const pagePromise = getCachedPage(pageNum);
        if (!pagePromise) return;
        const page = await pagePromise;
        if (!isMounted) return;

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const isMd = typeof window !== "undefined" && window.innerWidth >= 768;
        const areaW = slideAreaRef.current?.clientWidth
          ? Math.max(200, slideAreaRef.current.clientWidth - 48)
          : Math.max(200, availW - (isMd ? 256 : 0) - 48);
        const areaH = slideAreaRef.current?.clientHeight
          ? Math.max(200, slideAreaRef.current.clientHeight - 48)
          : Math.max(200, availH - 40 - 48);

        let baseScale = (zoomLevel / 100) * 1.3;
        if (fitMode === "width" && unscaledViewport.width > 0) {
          baseScale = (areaW / unscaledViewport.width) * (zoomLevel / 100);
        } else if (fitMode === "page" && unscaledViewport.width > 0 && unscaledViewport.height > 0) {
          const scaleW = areaW / unscaledViewport.width;
          const scaleH = areaH / unscaledViewport.height;
          baseScale = Math.min(scaleW, scaleH) * (zoomLevel / 100);
        }
        if (!baseScale || isNaN(baseScale) || baseScale <= 0) baseScale = 1.0;
        const dims = {
          scale: baseScale,
          width: Math.floor(unscaledViewport.width * baseScale),
          height: Math.floor(unscaledViewport.height * baseScale)
        };

        const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2.0);
        const rotation = (page.rotate || 0) % 360;
        const viewport = page.getViewport({ scale: dims.scale * dpr, rotation });

        const offscreen = document.createElement("canvas");
        offscreen.width = Math.floor(dims.width * dpr);
        offscreen.height = Math.floor(dims.height * dpr);

        const offCtx = offscreen.getContext("2d");
        if (!offCtx) return;

        const renderTask = page.render({ canvasContext: offCtx, viewport } as any);
        await renderTask.promise;
        if (!isMounted) return;

        slideCanvasCacheRef.current.set(pageNum, offscreen);
        renderedPageScales.current.set(pageNum, currentScaleKey);
        renderedPagesRef.current.add(pageNum);
      } catch {
        // Background prefetch errors are non-critical
      }
    }

    async function executeRenderingPipeline() {
      if (isPptx) {
        const isRenderedAtScale =
          lastRenderedPptxPageRef.current === currentPage &&
          renderedPageScales.current.get(currentPage) === currentScaleKey;

        const cachedOffscreen = slideCanvasCacheRef.current.get(currentPage);
        const canvas = canvasRefs.current.get(currentPage);

        if (cachedOffscreen && canvas && renderedPageScales.current.get(currentPage) === currentScaleKey) {
          canvas.width = cachedOffscreen.width;
          canvas.height = cachedOffscreen.height;
          canvas.style.width = `${activeSlideDims?.width || Math.floor(cachedOffscreen.width / 2)}px`;
          canvas.style.height = `${activeSlideDims?.height || Math.floor(cachedOffscreen.height / 2)}px`;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(cachedOffscreen, 0, 0);
          }

          lastRenderedPptxPageRef.current = currentPage;
          setRenderedPages((prev) => {
            if (prev.has(currentPage)) return prev;
            const next = new Set(prev);
            next.add(currentPage);
            return next;
          });
        } else if (!isRenderedAtScale && !activeRenderTasks.current.has(currentPage)) {
          await renderSinglePage(currentPage);
        }

        // Prefetch adjacent slides (next slide first, then previous) in background
        if (currentPage < totalPages) {
          await prefetchPptxSlide(currentPage + 1);
        }
        if (currentPage > 1) {
          await prefetchPptxSlide(currentPage - 1);
        }
      } else {
        const candidateList = Array.from(pagesToRender);
        candidateList.sort((a, b) => Math.abs(a - currentPageRef.current) - Math.abs(b - currentPageRef.current));
        for (const pageNum of candidateList) {
          if (!isMounted) break;
          const isRenderedAtScale =
            renderedPagesRef.current.has(pageNum) &&
            renderedPageScales.current.get(pageNum) === currentScaleKey;
          if (!isRenderedAtScale && !activeRenderTasks.current.has(pageNum)) {
            await renderSinglePage(pageNum);
          }
        }
      }
    }

    executeRenderingPipeline();

    return () => {
      isMounted = false;
      activeRenderTasks.current.forEach((task) => {
        try {
          task.cancel();
        } catch {}
      });
      activeRenderTasks.current.clear();
    };
  }, [pdfDoc, loading, pagesToRender, zoomLevel, fitMode, isPptx, containerDimensions, getCachedPage]);

  // 4. Stable focal-point scroll listener for page tracking (throttled with rAF)
  useEffect(() => {
    if (!containerRef.current || totalPages === 0 || isPptx) return;
    const container = containerRef.current;

    let rafId: number | null = null;

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) {
        if (containerRef.current && pendingTargetPageRef.current !== null) {
          const pageNum = pendingTargetPageRef.current;
          const targetElement = pageRefs.current.get(pageNum);
          if (targetElement) {
            const pageDim = pageDimensions.get(pageNum);
            let extraY = 0;
            const matchYPct = pendingMatchYPctRef.current;
            if (typeof matchYPct === "number" && matchYPct > 0) {
              const elHeight = targetElement.clientHeight || (pageDim ? pageDim.height : 600);
              extraY = Math.max(0, Math.floor((elHeight * matchYPct) / 100) - 60);
            }
            const maxScrollTop = Math.max(0, containerRef.current.scrollHeight - containerRef.current.clientHeight);
            const liveTargetScrollTop = Math.min(Math.max(0, targetElement.offsetTop + extraY - 12), maxScrollTop);
            const dist = Math.abs(containerRef.current.scrollTop - liveTargetScrollTop);
            const isAtBottom = containerRef.current.scrollTop + containerRef.current.clientHeight >= containerRef.current.scrollHeight - 15;

            if (dist <= 15 || isAtBottom) {
              isProgrammaticScrollRef.current = false;
              pendingTargetPageRef.current = null;
              pendingMatchYPctRef.current = undefined;
              targetScrollTopRef.current = null;
            }
          }
        }
        return;
      }

      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;

        if (isProgrammaticScrollRef.current || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const isAtBottom = containerRef.current.scrollTop + containerRef.current.clientHeight >= containerRef.current.scrollHeight - 15;

        let bestPage = currentPageRef.current;
        let maxVisibleHeight = 0;
        let lastVisiblePage = 0;

        pageRefs.current.forEach((el, pageNum) => {
          if (!el) return;
          const rect = el.getBoundingClientRect();

          const visibleTop = Math.max(rect.top, containerRect.top);
          const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
          const visibleHeight = Math.max(0, visibleBottom - visibleTop);

          if (visibleHeight > 0) {
            lastVisiblePage = Math.max(lastVisiblePage, pageNum);
          }

          if (visibleHeight > maxVisibleHeight) {
            maxVisibleHeight = visibleHeight;
            bestPage = pageNum;
          }
        });

        let candidatePage = bestPage;
        if (isAtBottom && lastVisiblePage > 0) {
          candidatePage = lastVisiblePage;
        }

        if (candidatePage > 0 && candidatePage !== currentPageRef.current) {
          currentPageRef.current = candidatePage;
          lastHandledTargetPageRef.current = candidatePage;
          setCurrentPage(candidatePage);
        }
      });
    };

    const handleUserInteraction = () => {
      isProgrammaticScrollRef.current = false;
      pendingTargetPageRef.current = null;
      pendingMatchYPctRef.current = undefined;
      targetScrollTopRef.current = null;
      if (scrollLockTimeoutRef.current) {
        clearTimeout(scrollLockTimeoutRef.current);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("wheel", handleUserInteraction, { passive: true });
    container.addEventListener("touchstart", handleUserInteraction, { passive: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("wheel", handleUserInteraction);
      container.removeEventListener("touchstart", handleUserInteraction);
    };
  }, [totalPages, isPptx]);

  // 5. Safely report page & total page changes to parent
  const lastReportedPageRef = useRef({ page: 0, total: 0 });

  useEffect(() => {
    if (
      totalPages > 0 &&
      currentPage > 0 &&
      (lastReportedPageRef.current.page !== currentPage || lastReportedPageRef.current.total !== totalPages)
    ) {
      lastReportedPageRef.current = { page: currentPage, total: totalPages };
      onPageChangeRef.current?.(currentPage, totalPages);
    }
  }, [currentPage, totalPages]);



  // 5. Full-Document Text Search Execution with Character Mapping, Progressive Streaming & Priority Scanning
  useEffect(() => {
    if (!pdfDoc || !debouncedQuery || !debouncedQuery.trim()) {
      setAllMatches([]);
      onSearchResultsChangeRef.current?.({ total: 0, matches: [], isSearching: false });
      return;
    }

    let isMounted = true;
    const query = debouncedQuery.toLowerCase().trim();

    // Signal search started immediately
    onSearchResultsChangeRef.current?.({ total: 0, matches: [], isSearching: true });

    async function performSearch() {
      const headingMatches: SearchMatch[] = [];
      const textMatches: SearchMatch[] = [];
      const seenSnippets = new Set<string>();

      // Order pages: current page first, then expanding outwardly, so user gets immediate results on visible pages
      const searchOrder: number[] = [];
      const visited = new Set<number>();

      const startPage = currentPageRef.current || 1;
      searchOrder.push(startPage);
      visited.add(startPage);

      const maxOffset = Math.max(startPage, pdfDoc!.numPages - startPage);
      for (let offset = 1; offset <= maxOffset; offset++) {
        const next = startPage + offset;
        const prev = startPage - offset;
        if (next <= pdfDoc!.numPages && !visited.has(next)) {
          searchOrder.push(next);
          visited.add(next);
        }
        if (prev >= 1 && !visited.has(prev)) {
          searchOrder.push(prev);
          visited.add(prev);
        }
      }

      let lastStreamTime = Date.now();

      for (const pageNum of searchOrder) {
        if (!isMounted) break;

        let pageData: CachedPageText | undefined = pageTextCacheRef.current.get(pageNum);
        let unscaledViewport: any = null;

        if (!pageData) {
          try {
            const pagePromise = getCachedPage(pageNum);
            if (!pagePromise) continue;
            const page = await pagePromise;
            unscaledViewport = page.getViewport({ scale: 1.0 });
            const textContent = await page.getTextContent();
            const items = (textContent.items as any[]) || [];

            let pageStr = "";
            const charMap: Array<{ item: any }> = [];

            for (const item of items) {
              const raw = (item.str || "").replace(/\u00A0/g, " ");
              if (!raw) continue;

              const hasTrailingSpace = pageStr.endsWith(" ");
              const hasLeadingSpace = raw.startsWith(" ");

              if (pageStr.length > 0 && !hasTrailingSpace && !hasLeadingSpace) {
                pageStr += " ";
                charMap.push({ item: null });
              }

              for (let i = 0; i < raw.length; i++) {
                charMap.push({ item });
                pageStr += raw[i];
              }
            }

            pageData = { pageStr, charMap, viewport: unscaledViewport };
            pageTextCacheRef.current.set(pageNum, pageData);
          } catch (pageErr) {
            console.warn(`[PdfDocumentViewer] Error extracting page ${pageNum} text:`, pageErr);
            continue;
          }
        } else {
          unscaledViewport = pageData.viewport;
        }

        if (!pageData || !pageData.pageStr) continue;
        const { pageStr, charMap } = pageData;

        try {
          const lowerPageStr = pageStr.toLowerCase();
          const cleanQuery = query.toLowerCase().trim();
          const spacelessQuery = cleanQuery.replace(/\s+/g, "");

          // 1. Direct Search in Page String
          const matchPositions: number[] = [];
          let pos = lowerPageStr.indexOf(cleanQuery);
          while (pos !== -1) {
            matchPositions.push(pos);
            pos = lowerPageStr.indexOf(cleanQuery, pos + cleanQuery.length);
          }

          // 2. Whitespace-flexible regex match (handles multiple spaces, line breaks, etc.)
          if (cleanQuery.includes(" ") && matchPositions.length === 0) {
            try {
              const escapedWords = cleanQuery.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
              const flexibleRegex = new RegExp(escapedWords.join("\\s+"), "gi");
              let match: RegExpExecArray | null;
              while ((match = flexibleRegex.exec(pageStr)) !== null) {
                if (!matchPositions.includes(match.index)) {
                  matchPositions.push(match.index);
                }
              }
            } catch {}
          }

          // 3. Fallback Spaceless Search (for split runs like "Hyper" + "ledger")
          if (spacelessQuery.length > 2) {
            let spacelessStr = "";
            const spacelessIndexMap: number[] = [];

            for (let i = 0; i < pageStr.length; i++) {
              if (!/\s/.test(pageStr[i])) {
                spacelessIndexMap.push(i);
                spacelessStr += lowerPageStr[i];
              }
            }

            let sPos = spacelessStr.indexOf(spacelessQuery);
            while (sPos !== -1) {
              const origStart = spacelessIndexMap[sPos];
              if (origStart !== undefined && !matchPositions.includes(origStart)) {
                matchPositions.push(origStart);
              }
              sPos = spacelessStr.indexOf(spacelessQuery, sPos + spacelessQuery.length);
            }
          }

          // Process matches for this page safely
          let pageHasNewMatches = false;
          for (const matchPos of matchPositions) {
            const start = Math.max(0, matchPos - 30);
            const end = Math.min(pageStr.length, matchPos + cleanQuery.length + 30);
            const snippet = pageStr.substring(start, end).replace(/\s+/g, " ").trim();

            const dedupKey = `${pageNum}:${snippet.toLowerCase()}`;
            if (seenSnippets.has(dedupKey)) continue;
            seenSnippets.add(dedupKey);

            let matchedItem = charMap[matchPos]?.item;
            if (!matchedItem) {
              for (let i = matchPos; i < Math.min(pageStr.length, matchPos + 10); i++) {
                if (charMap[i]?.item) {
                  matchedItem = charMap[i].item;
                  break;
                }
              }
            }

            const tx = matchedItem?.transform || [1, 0, 0, 1, 0, 0];
            const pdfX = tx[4] || 50;
            const pdfY = tx[5] || 50;
            const fontHeight = Math.abs(tx[3]) || matchedItem?.height || 12;
            const itemW = matchedItem?.width || (cleanQuery.length * fontHeight * 0.5);

            const isHeadingKeyword = /unit|chapter|section|module|part|overview|architecture|consensus|introduction|hyperledger|mefa|block|chain|crypto/i.test(snippet) ||
                                     /^\s*(\d+\.|unit|chapter|section)/i.test(snippet);
            const isLargeFont = fontHeight > 13;
            const isHeading = isHeadingKeyword || isLargeFont;

            let rect = { x: 50, y: 50, width: 100, height: 20, xPct: 8, yPct: 8, widthPct: 15, heightPct: 3 };
            try {
              if (unscaledViewport && typeof (unscaledViewport as any).convertToViewportRectangle === "function") {
                const [vx1, vy1, vx2, vy2] = (unscaledViewport as any).convertToViewportRectangle([pdfX, pdfY, pdfX + itemW, pdfY + fontHeight]);
                const uWidth = unscaledViewport.width || 600;
                const uHeight = unscaledViewport.height || 800;
                const minX = Math.min(vx1, vx2);
                const minY = Math.min(vy1, vy2);
                const w = Math.max(20, Math.abs(vx2 - vx1));
                const h = Math.max(14, Math.abs(vy2 - vy1));

                rect = {
                  x: minX,
                  y: minY,
                  width: w,
                  height: h,
                  xPct: (minX / uWidth) * 100,
                  yPct: (minY / uHeight) * 100,
                  widthPct: (w / uWidth) * 100,
                  heightPct: (h / uHeight) * 100
                };
              }
            } catch {
              // fallback rect preserved
            }

            const matchObj: SearchMatch = {
              id: `match-${headingMatches.length + textMatches.length}`,
              pageNumber: pageNum,
              snippet,
              matchText: cleanQuery,
              isHeading,
              headingTitle: isHeading ? snippet : undefined,
              rect
            };

            if (isHeading) {
              headingMatches.push(matchObj);
            } else {
              textMatches.push(matchObj);
            }
            pageHasNewMatches = true;
          }

          // Progressive streaming: stream results to UI periodically or as soon as new matches appear
          const now = Date.now();
          if (pageHasNewMatches || now - lastStreamTime > 250) {
            lastStreamTime = now;
            const runningCombined = [...headingMatches, ...textMatches]
              .sort((a, b) => a.pageNumber - b.pageNumber)
              .map((m, idx) => ({ ...m, id: `match-${idx}` }));
            setAllMatches(runningCombined);
            onSearchResultsChangeRef.current?.({
              total: runningCombined.length,
              matches: runningCombined,
              isSearching: true
            });
          }
        } catch (pageErr) {
          console.warn(`[PdfDocumentViewer] Error extracting page ${pageNum} text:`, pageErr);
        }

        // Yield execution to keep UI smooth
        await new Promise((r) => setTimeout(r, 0));
      }

      if (!isMounted) return;

      const finalCombined = [...headingMatches, ...textMatches]
        .sort((a, b) => a.pageNumber - b.pageNumber)
        .map((m, idx) => ({ ...m, id: `match-${idx}` }));

      setAllMatches(finalCombined);
      onSearchResultsChangeRef.current?.({
        total: finalCombined.length,
        matches: finalCombined,
        isSearching: false
      });
    }

    performSearch();

    return () => {
      isMounted = false;
    };
  }, [pdfDoc, debouncedQuery, getCachedPage]);

  // Loading safety timeout notice
  const [loadTakingLong, setLoadTakingLong] = useState(false);
  useEffect(() => {
    if (!loading) {
      setLoadTakingLong(false);
      return;
    }
    const timer = setTimeout(() => {
      setLoadTakingLong(true);
    }, 7000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 dark:text-slate-400 min-h-[350px]">
        <Loader2 size={36} className="animate-spin text-[#1E90FF] mb-3" />
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Preparing Document Pages...
        </h4>
        <p className="text-xs text-slate-400 mt-1">
          Rendering high-resolution pages
        </p>
        {loadTakingLong && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-[11px] text-amber-500 max-w-sm">
              Loading is taking longer than expected. You can wait or retry downloading the document stream.
            </p>
            {onErrorFallback && (
              <button
                type="button"
                onClick={() => onErrorFallback()}
                className="px-3 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Switch to Direct Buffer Download
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-xs text-rose-500">
        Failed to render paginated document: {error}
      </div>
    );
  }

  // ── Render PPTX Presentation View ─────────────────────────────────────────
  if (isPptx) {
    const pageMatches = allMatches.filter((m) => m.pageNumber === currentPage);

    return (
      <div ref={containerRef} className="w-full flex flex-col md:flex-row gap-4 h-[75vh]">
        {/* Slide Selection Sidebar */}
        <div className="w-full md:w-60 shrink-0 bg-white dark:bg-[#0F1A30] rounded-2xl border border-slate-200 dark:border-slate-800 p-3 overflow-y-auto flex flex-row md:flex-col gap-2 shadow-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 hidden md:block">
            Slides ({totalPages})
          </div>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              onClick={() => {
                setCurrentPage(num);
                onPageChange?.(num, totalPages);
              }}
              className={`p-2.5 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                num === currentPage
                  ? "border-[#1E90FF] bg-[#1E90FF]/10 font-bold text-[#1E90FF]"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              <div className="text-[10px] opacity-75">Slide {num} of {totalPages}</div>
              <div className="truncate font-semibold text-[11px]">Slide {num}</div>
            </button>
          ))}
        </div>

        {/* Slide Presentation Main Canvas */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#0F1A30] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
          <div className="h-10 shrink-0 px-4 bg-slate-50 dark:bg-[#080D1A] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span className="font-bold flex items-center gap-1.5">
              <Presentation size={14} className="text-orange-500" />
              <span>Slide {currentPage} of {totalPages}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => {
                  const prev = Math.max(1, currentPage - 1);
                  setCurrentPage(prev);
                  onPageChange?.(prev, totalPages);
                }}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => {
                  const next = Math.min(totalPages, currentPage + 1);
                  setCurrentPage(next);
                  onPageChange?.(next, totalPages);
                }}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            ref={slideAreaRef}
            className="flex-1 overflow-auto p-6 bg-slate-100 dark:bg-[#080D1A]/60 flex items-center justify-center"
          >
            <div
              ref={(el) => {
                if (el) pageRefs.current.set(currentPage, el);
              }}
              data-page-number={currentPage}
              style={{
                width: activeSlideDims ? `${activeSlideDims.width}px` : undefined,
                height: activeSlideDims ? `${activeSlideDims.height}px` : undefined
              }}
              className="relative bg-white dark:bg-[#0F1A30] rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-all shrink-0 flex items-center justify-center"
            >
              {lastRenderedPptxPageRef.current !== currentPage && !slideCanvasCacheRef.current.has(currentPage) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#080D1A] z-10">
                  <Loader2 size={28} className="animate-spin text-[#1E90FF] mb-2" />
                  <span className="text-xs text-slate-400">Loading slide {currentPage}...</span>
                </div>
              )}

              <canvas
                ref={(el) => {
                  if (el) canvasRefs.current.set(currentPage, el);
                }}
                className="block"
              />

              {/* Render Search Highlight Overlays on active slide */}
              {pageMatches.length > 0 && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                  {pageMatches.map((m) => {
                    const isCurrentActive = allMatches[activeMatchIndex]?.id === m.id;
                    if (!m.rect) return null;
                    const hasPct = typeof m.rect.xPct === "number" && typeof m.rect.yPct === "number";
                    const slideW = activeSlideDims?.width || 600;
                    const styleObj: React.CSSProperties = hasPct
                      ? {
                          left: `${m.rect.xPct}%`,
                          top: `${m.rect.yPct}%`,
                          width: `${Math.max(2, m.rect.widthPct || 10)}%`,
                          height: `${Math.max(1.5, m.rect.heightPct || 2)}%`
                        }
                      : {
                          left: `${m.rect.x * (slideW / 600)}px`,
                          top: `${m.rect.y * (slideW / 600)}px`,
                          width: `${Math.max(24, m.rect.width * (slideW / 600))}px`,
                          height: `${Math.max(14, m.rect.height * (slideW / 600))}px`
                        };

                    return (
                      <div
                        key={m.id}
                        style={styleObj}
                        className={`absolute rounded-sm transition-all ${
                          isCurrentActive
                            ? "bg-[#1E90FF]/30 border-2 border-[#1E90FF] shadow-md animate-pulse z-30"
                            : "bg-yellow-400/25 border border-amber-400/50 z-20"
                        }`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render DOCX & PDF Paginated Document View (Vertical Paper Stack) ─────
  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto flex flex-col items-center py-4 px-2 space-y-4"
    >
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
        const isPageLoaded = renderedPages.has(pageNum);
        const pageError = failedPages.get(pageNum);
        const pageMatches = allMatches.filter((m) => m.pageNumber === pageNum);

        const canvasEl = canvasRefs.current.get(pageNum);
        const pageDim = pageDimensions.get(pageNum);
        const availW = containerDimensions.width || containerRef.current?.clientWidth || 800;
        const availH = containerDimensions.height || containerRef.current?.clientHeight || 600;

        let computedWidth = canvasEl?.width || 600;
        let computedHeight = canvasEl?.height || 800;

        if (pageDim && pageDim.width > 0 && pageDim.height > 0) {
          const dims = getPageScaleAndDimensions(
            pageDim.width,
            pageDim.height,
            fitMode,
            zoomLevel,
            availW,
            availH
          );
          computedWidth = dims.width;
          computedHeight = dims.height;
        }

        const canvasWidth = computedWidth;

        const containerStyle: React.CSSProperties = {
          width: `${computedWidth}px`,
          height: `${computedHeight}px`
        };

        return (
          <div
            key={pageNum}
            ref={(el) => {
              if (el) pageRefs.current.set(pageNum, el);
            }}
            data-page-number={pageNum}
            id={`pdf-page-${pageNum}`}
            style={containerStyle}
            className="relative bg-white dark:bg-[#0F1A30] rounded-xl shadow-xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden transition-all group shrink-0 flex items-center justify-center my-2"
          >
            {/* Skeleton Loading Placeholder */}
            {!isPageLoaded && !pageError && (!canvasEl || canvasEl.width === 0) && (
              <div className="absolute inset-0 p-8 flex flex-col space-y-4 bg-white dark:bg-[#0F1A30] z-10 pointer-events-none">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                  <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                </div>
                <div className="space-y-3 pt-2">
                  <div className="h-3 w-full bg-slate-150 dark:bg-slate-800/70 rounded animate-pulse" />
                  <div className="h-3 w-5/6 bg-slate-150 dark:bg-slate-800/70 rounded animate-pulse" />
                  <div className="h-3 w-4/5 bg-slate-150 dark:bg-slate-800/70 rounded animate-pulse" />
                </div>
              </div>
            )}

            {/* Error Notice */}
            {pageError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-rose-50/90 dark:bg-rose-950/90 z-20">
                <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">
                  Failed to render page {pageNum}
                </div>
                <div className="text-[11px] text-rose-500/80 mb-3">{pageError}</div>
              </div>
            )}

            {/* Document Canvas */}
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set(pageNum, el);
              }}
              className={`block w-full h-full ${
                isPageLoaded || (canvasEl && canvasEl.width > 0) ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Render Overlay Text Match Highlights */}
            {isPageLoaded && pageMatches.length > 0 && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                {pageMatches.map((m) => {
                  const isCurrentActive = allMatches[activeMatchIndex]?.id === m.id;
                  if (!m.rect) return null;

                  const hasPct = typeof m.rect.xPct === "number" && typeof m.rect.yPct === "number";

                  const styleObj: React.CSSProperties = hasPct
                    ? {
                        left: `${m.rect.xPct}%`,
                        top: `${m.rect.yPct}%`,
                        width: `${Math.max(2, m.rect.widthPct || 10)}%`,
                        height: `${Math.max(1.5, m.rect.heightPct || 2)}%`
                      }
                    : {
                        left: `${m.rect.x * (canvasWidth / 600)}px`,
                        top: `${m.rect.y * (canvasWidth / 600)}px`,
                        width: `${Math.max(24, m.rect.width * (canvasWidth / 600))}px`,
                        height: `${Math.max(14, m.rect.height * (canvasWidth / 600))}px`
                      };

                  return (
                    <div
                      key={m.id}
                      style={styleObj}
                      className={`absolute rounded-sm transition-all ${
                        isCurrentActive
                          ? "bg-[#1E90FF]/30 border-2 border-[#1E90FF] shadow-md animate-pulse z-30"
                          : "bg-yellow-400/25 border border-amber-400/50 z-20"
                      }`}
                    />
                  );
                })}
              </div>
            )}

            {/* Page Badge Footnote */}
            <div className="absolute bottom-2 right-3 px-2 py-0.5 rounded-md bg-slate-900/60 text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity z-30">
              Page {pageNum} of {totalPages}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PdfDocumentViewer;
