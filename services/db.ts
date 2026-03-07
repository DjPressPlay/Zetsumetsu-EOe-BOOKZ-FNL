
import { getSupabase } from './supabase';
import { BookMetadata, BookData, Comment } from '../types';

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

export const saveBook = async (metadata: BookMetadata, data: BookData, userId: string): Promise<void> => {
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
      upload_date: new Date(metadata.uploadDate).toISOString(),
      reads: 0,
      upvotes: 0,
      user_id: userId
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
    uploadDate: new Date(item.upload_date).getTime(),
    reads: item.reads || 0,
    upvotes: item.upvotes || 0
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
    uploadDate: new Date(data.upload_date).getTime(),
    reads: data.reads || 0,
    upvotes: data.upvotes || 0
  };
};

export const incrementBookReads = async (id: string): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  // Fetch current reads
  const { data: current } = await supabase
    .from('bookz')
    .select('reads')
    .eq('id', id)
    .single();

  if (current) {
    await supabase
      .from('bookz')
      .update({ reads: (current.reads || 0) + 1 })
      .eq('id', id);
  }
};

export const incrementBookUpvotes = async (id: string, userId: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  // 1. Try to log the upvote (Unique constraint will prevent spam)
  const { error: logError } = await supabase
    .from('upvotes_log')
    .insert([{ book_id: id, user_id: userId }]);

  if (logError) {
    // If error is unique constraint violation, user already upvoted
    if (logError.code === '23505') return false;
    throw logError;
  }

  // 2. Increment total count
  const { data: current } = await supabase
    .from('bookz')
    .select('upvotes')
    .eq('id', id)
    .single();

  if (current) {
    await supabase
      .from('bookz')
      .update({ upvotes: (current.upvotes || 0) + 1 })
      .eq('id', id);
  }
  
  return true;
};

export const checkUserUpvote = async (bookId: string, userId: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from('upvotes_log')
    .select('id')
    .eq('book_id', bookId)
    .eq('user_id', userId)
    .single();

  return !!data;
};

export const getComments = async (bookId: string): Promise<Comment[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('book_id', bookId)
    .order('timestamp', { ascending: true });

  if (error) throw error;

  return (data || []).map(item => ({
    id: item.id,
    bookId: item.book_id,
    author: item.author,
    text: item.text,
    userId: item.user_id,
    timestamp: new Date(item.timestamp).getTime()
  }));
}

export const addComment = async (bookId: string, author: string, text: string, userId: string): Promise<void> => {
  const supabase = ensureClient();

  const { error } = await supabase
    .from('comments')
    .insert([{
      book_id: bookId,
      author,
      text,
      user_id: userId
    }]);

  if (error) throw error;
};

export const checkUserCommented = async (bookId: string, userId: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data } = await supabase
    .from('comments')
    .select('id')
    .eq('book_id', bookId)
    .eq('user_id', userId)
    .limit(1);

  return !!(data && data.length > 0);
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

export const trackVisit = async (): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  // Simple increment logic using a single row in site_metrics
  const { error } = await supabase.rpc('increment_visitor_count');
  
  if (error) {
    // Fallback if RPC doesn't exist yet: try to update manually
    const { data: current } = await supabase.from('site_metrics').select('count').eq('id', 'global').single();
    if (current) {
      await supabase.from('site_metrics').update({ count: current.count + 1 }).eq('id', 'global');
    } else {
      await supabase.from('site_metrics').insert([{ id: 'global', count: 1 }]);
    }
  }
};

export interface NetworkStats {
  visits: number;
  books: number;
  authors: number;
  genres: number;
  pages: number;
}

export const getNetworkStats = async (books: BookMetadata[]): Promise<NetworkStats> => {
  const supabase = getSupabase();
  let visits = 0;
  
  if (supabase) {
    const { data } = await supabase.from('site_metrics').select('count').eq('id', 'global').single();
    visits = data?.count || 0;
  }

  const uniqueAuthors = new Set(books.map(b => b.author)).size;
  const uniqueGenres = new Set(books.map(b => b.genre)).size;
  const totalPages = books.reduce((sum, b) => sum + b.pages, 0);

  return {
    visits,
    books: books.length,
    authors: uniqueAuthors,
    genres: uniqueGenres,
    pages: totalPages
  };
};

export const getUserCredits = async (userId: string): Promise<{ credits: number, isPremium: boolean }> => {
  const supabase = getSupabase();
  if (!supabase) return { credits: 0, isPremium: false };

  const { data, error } = await supabase
    .from('user_credits')
    .select('credits, is_premium')
    .eq('user_id', userId)
    .single();

  if (error) {
    // If not found, create with default 10
    if (error.code === 'PGRST116') {
      await supabase.from('user_credits').insert([{ user_id: userId, credits: 10, is_premium: false }]);
      return { credits: 10, isPremium: false };
    }
    return { credits: 0, isPremium: false };
  }

  return { credits: data.credits, isPremium: data.is_premium };
};

export const updateUserPremium = async (userId: string, isPremium: boolean): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase
    .from('user_credits')
    .upsert({ user_id: userId, is_premium: isPremium, last_updated: new Date().toISOString() }, { onConflict: 'user_id' });
};

export const getUserUploadCount = async (userId: string): Promise<number> => {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('bookz')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) return 0;
  return count || 0;
};
