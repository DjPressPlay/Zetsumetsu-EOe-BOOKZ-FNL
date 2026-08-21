
import { getSupabase } from './supabase';
import { BookMetadata, BookData, Comment } from '../types';
import { getDeviceId, getDeviceIdHistory } from './deviceId';

const BUCKET_NAME = 'bookz';
export const FREE_UPLOAD_LIMIT = 5;
export const PREMIUM_UPLOAD_LIMIT = 20;

export interface UserQuota {
  uploadCount: number;
  maxUploads: number;
  maxFreeUploads: number;
  remainingUploads: number;
  isPremium: boolean;
  credits: number;
}

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

/**
 * Postgres reports an unknown column as 42703; PostgREST reports the same thing as
 * PGRST204 when it is the schema cache that is behind. Either way the column is not
 * usable yet, so the caller should degrade instead of throwing.
 */
const isMissingColumn = (error: { code?: string } | null): boolean =>
  error?.code === '42703' || error?.code === 'PGRST204';

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

  let { data, error } = await supabase
    .from('user_credits')
    .select('credits, is_premium')
    .eq('user_id', userId)
    .maybeSingle();

  // Databases that predate the premium migration have no is_premium column.
  if (isMissingColumn(error)) {
    ({ data, error } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', userId)
      .maybeSingle());
  }

  if (error) {
    console.error('Failed to read user credits:', error);
    return { credits: 0, isPremium: false };
  }

  // No row yet: seed the account with the free allowance.
  if (!data) {
    const { error: insertError } = await supabase
      .from('user_credits')
      .insert([{ user_id: userId, credits: 10 }]);
    if (insertError) console.error('Failed to create credit account:', insertError);
    return { credits: 10, isPremium: false };
  }

  return { credits: data.credits ?? 0, isPremium: (data as { is_premium?: boolean }).is_premium ?? false };
};

export const deductCredits = async (userId: string, amount: number): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { credits: current } = await getUserCredits(userId);
  if (current < amount) return false;

  const { error } = await supabase
    .from('user_credits')
    .update({ credits: current - amount })
    .eq('user_id', userId);

  if (error) console.error('Failed to deduct credits:', error);
  return !error;
};

export const updateUserCredits = async (userId: string, amount: number): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: current } = await supabase
    .from('user_credits')
    .select('credits')
    .eq('user_id', userId)
    .single();

  const newCredits = (current?.credits || 0) + amount;

  const { error } = await supabase
    .from('user_credits')
    .upsert({ user_id: userId, credits: newCredits, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

  if (error) console.error('Failed to update credits:', error);
};

export const updateUserPremium = async (userId: string, isPremium: boolean): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('user_credits')
    .upsert({ user_id: userId, is_premium: isPremium, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

  if (isMissingColumn(error)) {
    console.error('Cannot store premium status: user_credits.is_premium is missing. Apply supabase/migrations/0001_fix_submission_schema.sql.');
    return;
  }
  if (error) console.error('Failed to update premium status:', error);
};

export const getUserUploadCount = async (userIds: string | string[]): Promise<number> => {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const ids = Array.isArray(userIds) ? userIds : [userIds];

  const { count, error } = await supabase
    .from('bookz')
    .select('*', { count: 'exact', head: true })
    .in('user_id', ids);

  if (error) {
    console.error('Failed to count uploads:', error);
    return 0;
  }
  return count || 0;
};

export const getUserQuota = async (): Promise<UserQuota> => {
  const deviceId = getDeviceId();
  const history = getDeviceIdHistory();
  
  // Try Supabase RPC function first if available
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('get_user_upload_quota', {
        p_device_id: deviceId,
        p_history_ids: history
      });
      if (!error && data && data.length > 0) {
        const row = data[0];
        const maxSlots = Number(row.max_slots) || (row.is_premium ? PREMIUM_UPLOAD_LIMIT : FREE_UPLOAD_LIMIT);
        const uploadCount = Number(row.upload_count) || 0;
        const remainingUploads = Math.max(0, maxSlots - uploadCount);
        return {
          uploadCount,
          maxUploads: maxSlots,
          maxFreeUploads: FREE_UPLOAD_LIMIT,
          remainingUploads,
          isPremium: Boolean(row.is_premium),
          credits: Number(row.credits) || 10
        };
      }
    } catch {
      // Fall through to client calculation
    }
  }

  const creditsData = await getUserCredits(deviceId);
  const uploadCount = await getUserUploadCount(history);
  const maxUploads = creditsData.isPremium ? PREMIUM_UPLOAD_LIMIT : FREE_UPLOAD_LIMIT;
  const remainingUploads = Math.max(0, maxUploads - uploadCount);

  return {
    uploadCount,
    maxUploads,
    maxFreeUploads: FREE_UPLOAD_LIMIT,
    remainingUploads,
    isPremium: creditsData.isPremium,
    credits: creditsData.credits
  };
};

export const subscribeToNewsletter = async (email: string): Promise<void> => {
  const supabase = ensureClient();
  const { error } = await supabase
    .from('newsletter_emails')
    .insert([{ email }]);
  
  if (error) {
    if (error.code === '23505') return; // Ignore duplicate emails
    if (error.message?.includes('does not exist')) {
      window.dispatchEvent(new CustomEvent('show-setup-guide'));
    }
    throw error;
  }
};

export const saveOrderToArchive = async (email: string, orderInfo: string): Promise<void> => {
  const supabase = ensureClient();
  // We save the order info into the email archive as requested
  const { error } = await supabase
    .from('newsletter_emails')
    .insert([{ email, order_info: orderInfo }]);

  if (!error) return;
  if (error.code === '23505') return; // Address is already archived

  // The order_info column has not been added yet. Keep the address rather than
  // losing the customer entirely, and never let this block the checkout redirect.
  if (isMissingColumn(error)) {
    console.error('newsletter_emails.order_info is missing, so order details were not archived. Apply supabase/migrations/0001_fix_submission_schema.sql.', error);
    const { error: fallbackError } = await supabase
      .from('newsletter_emails')
      .insert([{ email }]);
    if (fallbackError && fallbackError.code !== '23505') throw fallbackError;
    return;
  }

  throw error;
};

export const getNewsletterEmails = async (): Promise<{ email: string, signup_date: string, order_info?: string }[]> => {
  const supabase = ensureClient();
  const { data, error } = await supabase
    .from('newsletter_emails')
    .select('*')
    .order('signup_date', { ascending: false });
    
  if (error) {
    if (error.message?.includes('does not exist')) {
      window.dispatchEvent(new CustomEvent('show-setup-guide'));
    }
    throw error;
  }
  return data || [];
};
