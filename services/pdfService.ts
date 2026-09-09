// @ts-ignore
const pdfjsLib = window['pdfjs-dist/build/pdf'];
if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export interface ProcessedPdfStore {
  thumbnail: string;
  pdfData: ArrayBuffer;
  pageCount: number;
  originalSize: number;
  finalSize: number;
  isCompressed: boolean;
  savedPercent: number;
  exceedsSupabaseLimit: boolean;
  passesRun?: number;
  compressionError?: string;
}

export interface GhostscriptCompressionResult {
  pdfData: ArrayBuffer;
  originalSize: number;
  finalSize: number;
  savedBytes: number;
  savedPercent: number;
  isCompressed: boolean;
  passesRun: number;
  exceedsSupabaseLimit: boolean;
  error?: string;
}

/**
 * Compresses large PDF files by slicing them into safe 6MB chunks,
 * streaming them to the server to bypass Cloud Run's 32MB single HTTP body ceiling,
 * and running Ghostscript image downsampling and re-encoding on disk.
 */
export const compressPdfChunked = async (
  rawBuffer: ArrayBuffer,
  onProgress?: (percent: number, statusText: string) => void
): Promise<GhostscriptCompressionResult> => {
  const originalSize = rawBuffer.byteLength;
  const HARD_SUPABASE_LIMIT = 50 * 1024 * 1024;
  const CHUNK_SIZE = 6 * 1024 * 1024; // 6 MB safe chunks (comfortably under 32MB)

  try {
    onProgress?.(5, "Initializing compression session...");
    const startRes = await fetch("/api/compress-chunked/start", { method: "POST" });
    if (!startRes.ok) throw new Error("Failed to initialize chunked compression session");
    const { sessionId } = await startRes.json();

    const totalChunks = Math.ceil(originalSize / CHUNK_SIZE);
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(originalSize, start + CHUNK_SIZE);
      const chunk = rawBuffer.slice(start, end);

      const pct = Math.round(10 + ((i + 1) / totalChunks) * 60); // 10% to 70%
      onProgress?.(pct, `Streaming chunk ${i + 1} of ${totalChunks}...`);

      const chunkRes = await fetch("/api/compress-chunked/chunk", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "x-session-id": sessionId,
          "x-chunk-index": i.toString()
        },
        body: chunk
      });

      if (!chunkRes.ok) {
        throw new Error(`Chunk upload failed with status ${chunkRes.status}`);
      }
    }

    onProgress?.(75, "Downsampling images & recompressing PDF with Ghostscript...");
    const finishRes = await fetch("/api/compress-chunked/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    });

    if (!finishRes.ok) {
      throw new Error(`Ghostscript engine returned status ${finishRes.status}`);
    }

    onProgress?.(95, "Finalizing compressed artifact...");
    const compressedBuffer = await finishRes.arrayBuffer();
    const finalSize = compressedBuffer.byteLength;
    const isCompressed = finishRes.headers.get("x-is-compressed") === "true" || finalSize < originalSize;
    const savedBytes = Math.max(0, originalSize - finalSize);
    const savedPercent = originalSize > 0 ? (savedBytes / originalSize) * 100 : 0;
    const passesRun = Number(finishRes.headers.get("x-passes-run")) || 1;
    const exceedsSupabaseLimit = finalSize > HARD_SUPABASE_LIMIT;

    onProgress?.(100, "Compression complete");

    return {
      pdfData: isCompressed ? compressedBuffer : rawBuffer,
      originalSize,
      finalSize: isCompressed ? finalSize : originalSize,
      savedBytes,
      savedPercent,
      isCompressed,
      passesRun,
      exceedsSupabaseLimit
    };
  } catch (err: any) {
    console.error("Chunked compression error:", err);
    return {
      pdfData: rawBuffer,
      originalSize,
      finalSize: originalSize,
      savedBytes: 0,
      savedPercent: 0,
      isCompressed: false,
      passesRun: 0,
      exceedsSupabaseLimit: originalSize > HARD_SUPABASE_LIMIT,
      error: err?.message || "Chunked compression failed"
    };
  }
};

/**
 * Sends a PDF ArrayBuffer to the automatic server-side Ghostscript optimizer.
 * For files > 20 MB (or if single HTTP request fails), streams in chunks.
 */
export const compressPdfWithGhostscript = async (
  rawBuffer: ArrayBuffer,
  onProgress?: (percent: number, statusText: string) => void
): Promise<GhostscriptCompressionResult> => {
  const originalSize = rawBuffer.byteLength;
  const HARD_SUPABASE_LIMIT = 50 * 1024 * 1024;

  // For any file larger than 20MB, use the robust chunked streaming pipeline
  if (originalSize > 20 * 1024 * 1024) {
    return compressPdfChunked(rawBuffer, onProgress);
  }

  try {
    onProgress?.(30, "Optimizing PDF with Ghostscript...");
    const response = await fetch('/api/compress-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
      },
      body: rawBuffer
    });

    if (!response.ok) {
      // If direct single POST fails (e.g. HTTP 413), fallback to chunked upload
      return compressPdfChunked(rawBuffer, onProgress);
    }

    const compressedBuffer = await response.arrayBuffer();
    const finalSize = compressedBuffer.byteLength;
    const isCompressed = response.headers.get('x-is-compressed') === 'true' || finalSize < originalSize;
    const savedBytes = Math.max(0, originalSize - finalSize);
    const savedPercent = originalSize > 0 ? (savedBytes / originalSize) * 100 : 0;
    const passesRun = Number(response.headers.get('x-passes-run')) || (isCompressed ? 1 : 0);
    const exceedsSupabaseLimit = finalSize > HARD_SUPABASE_LIMIT;

    onProgress?.(100, "Optimization complete");

    return {
      pdfData: isCompressed ? compressedBuffer : rawBuffer,
      originalSize,
      finalSize: isCompressed ? finalSize : originalSize,
      savedBytes,
      savedPercent,
      isCompressed,
      passesRun,
      exceedsSupabaseLimit
    };
  } catch (error: any) {
    console.warn('Direct compression fallback to chunked pipeline:', error);
    return compressPdfChunked(rawBuffer, onProgress);
  }
};

/**
 * Standard PDF ingestion pipeline:
 * 1. Generates the storefront cover thumbnail (< 30KB)
 * 2. Optimizes PDF binary silently in the background
 */
export const processPdfForStore = async (
  file: File,
  onProgress?: (percent: number, statusText: string) => void
): Promise<ProcessedPdfStore> => {
  const arrayBuffer = await file.arrayBuffer();
  const bufferForProcessing = arrayBuffer.slice(0);
  const originalSize = file.size;
  
  let pageCount = 1;
  let thumbnail = '';

  try {
    onProgress?.(3, "Rendering storefront cover thumbnail...");
    const pdf = await pdfjsLib.getDocument({ data: bufferForProcessing }).promise;
    pageCount = pdf.numPages;
    const page = await pdf.getPage(1);
    
    // Scale 0.6 for the storefront thumbnail
    const viewport = page.getViewport({ scale: 0.6 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (context) {
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;
    }

    // High compression JPEG thumbnail
    thumbnail = canvas.toDataURL('image/jpeg', 0.6);
    canvas.width = 0;
    canvas.height = 0;
  } catch (renderErr) {
    console.error('Thumbnail generation warning:', renderErr);
  }

  // Optimize document stream in chunks with Ghostscript
  const compResult = await compressPdfWithGhostscript(arrayBuffer, onProgress);

  return {
    thumbnail,
    pdfData: compResult.pdfData,
    pageCount,
    originalSize: compResult.originalSize,
    finalSize: compResult.finalSize,
    isCompressed: compResult.isCompressed,
    savedPercent: compResult.savedPercent,
    exceedsSupabaseLimit: compResult.exceedsSupabaseLimit,
    passesRun: compResult.passesRun,
    compressionError: compResult.error
  };
};

const docCache = new WeakMap<ArrayBuffer, any>();

export const getPdfDocument = async (pdfData: ArrayBuffer) => {
  let docPromise = docCache.get(pdfData);
  if (!docPromise) {
    const bufferForRendering = pdfData.slice(0);
    docPromise = pdfjsLib.getDocument({ data: bufferForRendering }).promise;
    docCache.set(pdfData, docPromise);
  }
  return docPromise;
};

export const renderPdfPage = async (pdfData: ArrayBuffer, pageNum: number, container: HTMLCanvasElement) => {
  const pdf = await getPdfDocument(pdfData);
  if (pageNum < 1 || pageNum > pdf.numPages) return pdf.numPages;
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.5 });
  
  // Cancel any ongoing render task on this container
  if ((container as any)._renderTask) {
    try {
      (container as any)._renderTask.cancel();
    } catch {
      // ignore cancellation exception
    }
  }

  // Render to offscreen canvas first (double-buffering) to prevent blank flashing
  const offscreen = document.createElement('canvas');
  offscreen.width = viewport.width;
  offscreen.height = viewport.height;
  const offscreenCtx = offscreen.getContext('2d');
  if (!offscreenCtx) return pdf.numPages;

  const renderTask = page.render({ canvasContext: offscreenCtx, viewport });
  (container as any)._renderTask = renderTask;
  try {
    await renderTask.promise;
    // Atomically transfer rendered frame to visible canvas in a single frame
    if (container.width !== viewport.width || container.height !== viewport.height) {
      container.width = viewport.width;
      container.height = viewport.height;
    }
    const context = container.getContext('2d');
    if (context) {
      context.drawImage(offscreen, 0, 0);
    }
  } catch (err: any) {
    if (err?.name !== 'RenderingCancelledException') {
      throw err;
    }
  } finally {
    if ((container as any)._renderTask === renderTask) {
      (container as any)._renderTask = null;
    }
    offscreen.width = 0;
    offscreen.height = 0;
  }
  return pdf.numPages;
};

const pageDataUrlCache = new Map<string, string>();

export const clearPageDataUrlCache = () => {
  pageDataUrlCache.clear();
};

export const renderPdfPageToDataUrl = async (
  pdfData: ArrayBuffer,
  pageNum: number,
  scale = 1.5
): Promise<string | null> => {
  const cacheKey = `${pageNum}_${scale}`;
  if (pageDataUrlCache.has(cacheKey)) {
    return pageDataUrlCache.get(cacheKey)!;
  }
  try {
    const pdf = await getPdfDocument(pdfData);
    if (pageNum < 1 || pageNum > pdf.numPages) return null;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    pageDataUrlCache.set(cacheKey, dataUrl);
    canvas.width = 0;
    canvas.height = 0;
    return dataUrl;
  } catch (err) {
    console.error('Error rendering page to dataUrl:', err);
    return null;
  }
};
