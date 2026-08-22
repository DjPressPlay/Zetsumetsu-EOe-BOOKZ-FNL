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
