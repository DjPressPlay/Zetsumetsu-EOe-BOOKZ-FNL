
export interface BookMetadata {
  id: string;
  title: string;
  author: string;
  genre: string;
  pages: number;
  thumbnail: string; // Base64 of Page 1
  uploadDate: number;
  reads: number;
  upvotes: number;
}

export interface Comment {
  id: string;
  bookId: string;
  author: string;
  text: string;
  timestamp: number;
  userId?: string;
}

export interface BookData {
  id: string;
  pdfData: ArrayBuffer;
}
