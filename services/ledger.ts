import { getSupabase } from './supabase';
import { LedgerEntry, LedgerActionType } from '../types';
import { getDeviceId } from './deviceId';

// Purge any legacy localStorage cache to ensure strict zero-local-storage operation
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('zetsu_ledger_entries_v1');
    window.localStorage.removeItem('zetsu_ledger_entries');
  }
} catch {
  // Ignore storage access restrictions
}

/**
 * Formats a clean, readable default title based on action and details
 */
export const formatActionTitle = (
  action: LedgerActionType,
  actor: string,
  targetTitle?: string,
  metadata?: any
): string => {
  switch (action) {
    case 'post':
      return metadata?.details || `${actor} transmitted a short post to the public ledger`;
    case 'join':
      return `${actor} joined the Zetsu EOe network`;
    case 'newsletter_signup':
      return `${actor} signed up for the Marqs Promo Newsletter`;
    case 'read_page':
      if (metadata?.page) {
        return `Read Page ${metadata.page}${metadata.totalPages ? ` of ${metadata.totalPages}` : ''} of "${targetTitle || 'Book'}"`;
      }
      return `Read "${targetTitle || 'Book'}"`;
    case 'upload':
      return `Published new book "${targetTitle || 'Untitled Book'}" to the public archives`;
    case 'view':
      return `Viewed book profile for "${targetTitle || 'Archive'}"`;
    case 'comment':
      return `Posted comment on "${targetTitle || 'Archive'}"`;
    case 'share':
      return `Shared public bitstream permalink for "${targetTitle || 'Archive'}"`;
    case 'buy_copies':
      if (metadata?.copies && metadata?.format) {
        return `Purchased ${metadata.copies}x ${metadata.format} edition of "${targetTitle || 'Book'}"`;
      }
      return `Purchased physical print copy of "${targetTitle || 'Book'}"`;
    case 'boost':
      if (metadata?.tier) {
        return `Activated ${metadata.tier} Buy Back Boost on "${targetTitle || 'Listing'}"`;
      }
      return `Boosted listing for "${targetTitle || 'Archive'}"`;
    default:
      return `Action recorded on ${targetTitle || 'platform'}`;
  }
};

/**
 * Transforms a raw Supabase ledger row into a strongly-typed LedgerEntry
 */
const mapRowToLedgerEntry = (row: any): LedgerEntry => {
  return {
    id: row.id,
    action: row.action as LedgerActionType,
    title: row.title,
    actor: row.actor,
    targetTitle: row.target_title || undefined,
    targetId: row.target_id || undefined,
    targetPath: row.target_path || '/ledger',
    timestamp: typeof row.timestamp === 'number'
      ? row.timestamp
      : (!isNaN(Number(row.timestamp)) ? Number(row.timestamp) : new Date(row.created_at || row.timestamp).getTime()),
    metadata: row.metadata || {}
  };
};

/**
 * Public function to record an action to The Ledger.
 * Directly and exclusively writes to the Supabase database table `public.ledger_entries`.
 * NEVER writes to localStorage.
 */
export const recordLedgerAction = async (params: {
  action: LedgerActionType;
  targetPath: string;
  actor?: string;
  targetTitle?: string;
  targetId?: string;
  title?: string;
  metadata?: LedgerEntry['metadata'];
}): Promise<LedgerEntry> => {
  const deviceId = getDeviceId();
  const actor = params.actor || 'Archivist_' + deviceId.substring(0, 6);
  const title = params.title || formatActionTitle(params.action, actor, params.targetTitle, params.metadata);
  const timestamp = Date.now();
  const id = 'ldg_' + timestamp + '_' + Math.random().toString(36).substring(2, 8);

  const entry: LedgerEntry = {
    id,
    action: params.action,
    title,
    actor,
    targetTitle: params.targetTitle,
    targetId: params.targetId,
    targetPath: params.targetPath,
    timestamp,
    metadata: params.metadata || {}
  };

  // Dispatch local in-memory UI event for instantaneous UI feedback
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zetsu-ledger-entry-added', { detail: entry }));
  }

  // Persist directly to Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('ledger_entries')
        .insert([{
          id: entry.id,
          action: entry.action,
          title: entry.title,
          actor: entry.actor,
          target_title: entry.targetTitle || null,
          target_id: entry.targetId || null,
          target_path: entry.targetPath,
          timestamp: entry.timestamp,
          created_at: new Date(entry.timestamp).toISOString(),
          metadata: entry.metadata || {}
        }]);

      if (error) {
        console.error('Supabase ledger_entries insert error:', error);
      }
    } catch (err) {
      console.error('Failed to post ledger entry to Supabase:', err);
    }
  } else {
    console.warn('Supabase client not initialized when recording ledger entry');
  }

  return entry;
};

/**
 * Transmits a short post message directly to Supabase ledger_entries
 */
export const postShortLedgerMessage = async (
  message: string,
  authorName?: string,
  targetPath: string = '/ledger'
): Promise<LedgerEntry> => {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error('Message cannot be empty');
  }

  const deviceId = getDeviceId();
  const actor = authorName?.trim() || 'Archivist_' + deviceId.substring(0, 6);

  return recordLedgerAction({
    action: 'post',
    actor,
    title: trimmed,
    targetPath,
    targetTitle: 'Ledger Stream',
    metadata: {
      details: trimmed,
      marqsAmount: 1
    }
  });
};

/**
 * Fetches paginated ledger entries directly from the Supabase database.
 * No localStorage queries or caching.
 */
export const getLedgerEntries = async (
  page: number = 1,
  limit: number = 25,
  actionFilter?: string
): Promise<{ entries: LedgerEntry[]; hasMore: boolean; total: number }> => {
  const supabase = getSupabase();
  if (!supabase) {
    return { entries: [], hasMore: false, total: 0 };
  }

  try {
    let query = supabase
      .from('ledger_entries')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false });

    if (actionFilter && actionFilter !== 'all') {
      query = query.eq('action', actionFilter);
    }

    const offset = (page - 1) * limit;
    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching ledger entries from Supabase:', error);
      return { entries: [], hasMore: false, total: 0 };
    }

    const entries: LedgerEntry[] = (data || []).map(mapRowToLedgerEntry);
    const total = count ?? entries.length;
    const hasMore = offset + entries.length < total;

    return {
      entries,
      hasMore,
      total
    };
  } catch (err) {
    console.error('Supabase ledger fetch failed:', err);
    return { entries: [], hasMore: false, total: 0 };
  }
};

/**
 * Fetches real-time aggregated ledger stats directly from Supabase.
 */
export const getLedgerStats = async () => {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      totalEntries: 0,
      recentHourVelocity: 0,
      actionCounts: {},
      actionsPerMinute: '0.0'
    };
  }

  try {
    const oneHourAgo = Date.now() - 1000 * 60 * 60;

    // 1. Get total count
    const { count: totalCount } = await supabase
      .from('ledger_entries')
      .select('*', { count: 'exact', head: true });

    // 2. Get recent entries in the last hour
    const { data: recentData, count: recentCount } = await supabase
      .from('ledger_entries')
      .select('action, timestamp')
      .gte('timestamp', oneHourAgo);

    const totalEntries = totalCount ?? (recentData?.length || 0);
    const recentVelocity = recentCount ?? (recentData?.length || 0);

    const actionCounts: Record<string, number> = {};
    if (recentData) {
      recentData.forEach(row => {
        actionCounts[row.action] = (actionCounts[row.action] || 0) + 1;
      });
    }

    return {
      totalEntries,
      recentHourVelocity: recentVelocity,
      actionCounts,
      actionsPerMinute: (recentVelocity / 60).toFixed(1)
    };
  } catch (err) {
    console.error('Failed to compute ledger stats from Supabase:', err);
    return {
      totalEntries: 0,
      recentHourVelocity: 0,
      actionCounts: {},
      actionsPerMinute: '0.0'
    };
  }
};

/**
 * Subscribes to live Supabase inserts on the `ledger_entries` table in real time.
 * Returns an unsubscribe teardown function.
 */
export const subscribeToLedgerUpdates = (onNewEntry: (entry: LedgerEntry) => void): (() => void) => {
  const supabase = getSupabase();
  if (!supabase) {
    return () => {};
  }

  try {
    const channel = supabase
      .channel('public:ledger_entries')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ledger_entries'
        },
        (payload) => {
          if (payload.new) {
            const entry = mapRowToLedgerEntry(payload.new);
            onNewEntry(entry);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.error('Failed to initialize Supabase ledger subscription:', err);
    return () => {};
  }
};
