
// @ts-ignore
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export const processPdfForStore = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const bufferForProcessing = arrayBuffer.slice(0);
  
  const pdf = await pdfjsLib.getDocument({ data: bufferForProcessing }).promise;
  const page = await pdf.getPage(1);
  
  // Use a smaller scale for the storefront thumbnail to save DB space
  const viewport = page.getViewport({ scale: 0.6 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (context) {
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;
  }

  // Use 0.6 quality to ensure each thumbnail is < 30KB
  // 50MB / 30KB = ~1,600 books capacity
  const thumbnail = canvas.toDataURL('image/jpeg', 0.6);
  
  canvas.width = 0;
  canvas.height = 0;

  return {
    thumbnail,
    pdfData: arrayBuffer,
    pageCount: pdf.numPages
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
