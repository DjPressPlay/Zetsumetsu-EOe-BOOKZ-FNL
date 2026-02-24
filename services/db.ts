
import { getSupabase } from './supabase';
import { BookMetadata, BookData } from '../types';

const BUCKET_NAME = 'bookz';

/**
 * Internal helper to ensure client exists before operations
 */
const ensureClient = () => {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }
  return supabase;
};

export const saveBook = async (metadata: BookMetadata, data: BookData): Promise<void> => {
  const supabase = ensureClient();
  
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(`${metadata.id}.pdf`, data.pdfData, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (storageError) throw storageError;

  const { error: dbError } = await supabase
    .from('bookz')
    .insert([{
      id: metadata.id,
      title: metadata.title,
      author: metadata.author,
      genre: metadata.genre,
      pages: metadata.pages,
      thumbnail: metadata.thumbnail,
      upload_date: new Date(metadata.uploadDate).toISOString()
    }]);

  if (dbError) throw dbError;
};

export const getAllMetadata = async (): Promise<BookMetadata[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('bookz')
    .select('*')
    .order('upload_date', { ascending: false });

  if (error) throw error;
  
  return (data || []).map(item => ({
    id: item.id,
    title: item.title,
    author: item.author,
    genre: item.genre,
    pages: item.pages,
    thumbnail: item.thumbnail,
    uploadDate: new Date(item.upload_date).getTime()
  }));
};

export const getBookMetadata = async (id: string): Promise<BookMetadata | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('bookz')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  
  return {
    id: data.id,
    title: data.title,
    author: data.author,
    genre: data.genre,
    pages: data.pages,
    thumbnail: data.thumbnail,
    uploadDate: new Date(data.upload_date).getTime()
  };
};

export const getBookData = async (id: string): Promise<BookData | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(`${id}.pdf`);

  if (error || !data) return null;
  
  const arrayBuffer = await data.arrayBuffer();
  
  return {
    id,
    pdfData: arrayBuffer
  };
};
