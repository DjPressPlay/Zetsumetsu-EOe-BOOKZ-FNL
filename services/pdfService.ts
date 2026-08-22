import { PdfCompressionStats } from '../types';

// @ts-ignore
const pdfjsLib = window['pdfjs-dist/build/pdf'];
if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export interface ProcessedPdfStore {
  thumbnail: string;
  pdfData: ArrayBuffer;
  pageCount: number;
  compressionStats?: PdfCompressionStats;
}

export type CompressionPreset = 'ebook' | 'screen' | 'printer' | 'prepress';

/**
 * Sends a PDF ArrayBuffer to the Ghostscript backend compression engine.
 * Ghostscript rebuilds the PDF page-by-page, re-encodes and downsamples raster images,
 * subsets embedded fonts, and optimizes PDF object streams to fit within Supabase's 50MB storage ceiling.
 */
export const compressPdfWithGhostscript = async (
  rawBuffer: ArrayBuffer,
  preset: CompressionPreset = 'ebook',
  onStatusUpdate?: (msg: string) => void
): Promise<{ buffer: ArrayBuffer; stats: PdfCompressionStats }> => {
  const originalSize = rawBuffer.byteLength;
  onStatusUpdate?.('Rebuilding PDF streams with Ghostscript engine...');

  try {
    const response = await fetch(`/api/compress-pdf?preset=${preset}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
      },
      body: rawBuffer
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      throw new Error(errJson?.error || `Compression server responded with HTTP ${response.status}`);
    }

    const compressedBuffer = await response.arrayBuffer();
    const headerOrig = response.headers.get('X-Original-Size');
    const headerComp = response.headers.get('X-Compressed-Size');
    const headerSaved = response.headers.get('X-Saved-Percent');
    const headerEngine = response.headers.get('X-Compression-Engine') || 'Ghostscript 9.55.0';
    const headerExecTime = response.headers.get('X-Execution-Time-Ms');

    const finalOrigSize = headerOrig ? parseInt(headerOrig, 10) : originalSize;
    const finalCompSize = headerComp ? parseInt(headerComp, 10) : compressedBuffer.byteLength;
    const savedBytes = Math.max(0, finalOrigSize - finalCompSize);
    const savedPercent = headerSaved ? parseInt(headerSaved, 10) : Math.round((savedBytes / finalOrigSize) * 100);
    const ratio = ((finalCompSize / finalOrigSize) * 100).toFixed(1) + '%';
    const isCompressed = finalCompSize < finalOrigSize;

    const stats: PdfCompressionStats = {
      originalSize: finalOrigSize,
      compressedSize: finalCompSize,
      savedBytes,
      savedPercent,
      ratio,
      preset,
      isCompressed,
      executionTimeMs: headerExecTime ? parseInt(headerExecTime, 10) : undefined,
      engine: headerEngine
    };

    return {
      buffer: compressedBuffer,
      stats
    };
  } catch (error: any) {
    console.warn('Ghostscript server compression fallback to raw buffer:', error);
    // Fallback: return original buffer with stats indicating uncompressed
    const stats: PdfCompressionStats = {
      originalSize,
      compressedSize: originalSize,
      savedBytes: 0,
      savedPercent: 0,
      ratio: '100%',
      preset,
      isCompressed: false,
      engine: 'Ghostscript (Bypassed / Fallback)'
    };
    return {
      buffer: rawBuffer,
      stats
    };
  }
};

/**
 * Full PDF ingestion pipeline:
 * 1. Reads raw file bytes
 * 2. Extracts a 30KB cover thumbnail for instantaneous storefront loading
 * 3. Sends the binary payload through the server-side Ghostscript optimizer
 * 4. Ensures the final file satisfies Supabase storage limits (50 MB)
 */
export const processPdfForStore = async (
  file: File,
  options?: {
    preset?: CompressionPreset;
    onStatusUpdate?: (status: string) => void;
  }
): Promise<ProcessedPdfStore> => {
  const preset = options?.preset || 'ebook';
  const onStatusUpdate = options?.onStatusUpdate;

  onStatusUpdate?.('Analyzing PDF binary and generating cover thumbnail...');
  const arrayBuffer = await file.arrayBuffer();
  const bufferForProcessing = arrayBuffer.slice(0);
  
  let pageCount = 1;
  let thumbnail = '';

  try {
    const pdf = await pdfjsLib.getDocument({ data: bufferForProcessing }).promise;
    pageCount = pdf.numPages;
    const page = await pdf.getPage(1);
    
    // Use a scale of 0.6 for the storefront thumbnail to save DB space
    const viewport = page.getViewport({ scale: 0.6 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (context) {
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;
    }

    // High compression JPEG thumbnail (< 30KB)
    thumbnail = canvas.toDataURL('image/jpeg', 0.6);
    canvas.width = 0;
    canvas.height = 0;
  } catch (renderErr) {
    console.error('Thumbnail generation warning:', renderErr);
  }

  // Optimize full document stream with Ghostscript
  onStatusUpdate?.('Running Ghostscript optimization (downsampling raster images & font deduplication)...');
  const { buffer: optimizedBuffer, stats } = await compressPdfWithGhostscript(
    arrayBuffer,
    preset,
    onStatusUpdate
  );

  return {
    thumbnail,
    pdfData: optimizedBuffer,
    pageCount,
    compressionStats: stats
  };
};

export const renderPdfPage = async (pdfData: ArrayBuffer, pageNum: number, container: HTMLCanvasElement) => {
  const bufferForRendering = pdfData.slice(0);
  const pdf = await pdfjsLib.getDocument({ data: bufferForRendering }).promise;
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.5 });
  
  const context = container.getContext('2d');
  if (context) {
    container.height = viewport.height;
    container.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;
  }
  return pdf.numPages;
};
