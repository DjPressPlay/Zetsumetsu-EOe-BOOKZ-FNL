// @ts-ignore
const pdfjsLib = window['pdfjs-dist/build/pdf'];
if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export interface ProcessedPdfStore {
  thumbnail: string;
  pdfData: ArrayBuffer;
  pageCount: number;
}

/**
 * Sends a PDF ArrayBuffer to the automatic server-side Ghostscript optimizer.
 * Silently rebuilds and compresses large files in the background.
 */
export const compressPdfWithGhostscript = async (rawBuffer: ArrayBuffer): Promise<ArrayBuffer> => {
  try {
    const response = await fetch('/api/compress-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
      },
      body: rawBuffer
    });

    if (!response.ok) {
      return rawBuffer;
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.warn('Silent compression fallback:', error);
    return rawBuffer;
  }
};

/**
 * Standard PDF ingestion pipeline:
 * 1. Generates the storefront cover thumbnail (< 30KB)
 * 2. Optimizes PDF binary silently in the background
 */
export const processPdfForStore = async (file: File): Promise<ProcessedPdfStore> => {
  const arrayBuffer = await file.arrayBuffer();
  const bufferForProcessing = arrayBuffer.slice(0);
  
  let pageCount = 1;
  let thumbnail = '';

  try {
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

  // Optimize full document stream silently in background
  const optimizedBuffer = await compressPdfWithGhostscript(arrayBuffer);

  return {
    thumbnail,
    pdfData: optimizedBuffer,
    pageCount
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
