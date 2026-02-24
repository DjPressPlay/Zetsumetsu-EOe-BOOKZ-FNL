
export interface BookMetadata {
  id: string;
  title: string;
  author: string;
  genre: string;
  pages: number;
  thumbnail: string; // Base64 of Page 1
  uploadDate: number;
}

export interface BookData {
  id: string;
  pdfData: ArrayBuffer;
}
