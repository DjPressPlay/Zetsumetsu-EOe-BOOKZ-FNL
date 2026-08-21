import { getSupabase } from './supabase';
import { LedgerEntry, LedgerActionType } from '../types';
import { getDeviceId } from './deviceId';

const LEDGER_STORAGE_KEY = 'zetsu_ledger_entries_v1';
const MAX_LOCAL_ENTRIES = 500;

/**
 * Seed historical ledger entries to populate the ledger immediately
 * with real deep-links to the platform's books, authors, newsletter, and reader actions.
 */
const SEED_LEDGER_ENTRIES: LedgerEntry[] = [
  {
    id: 'ledger_seed_01',
    action: 'join',
    title: 'Archivist NeonCipher initiated a new neural identity profile',
    actor: 'NeonCipher',
    targetTitle: 'NeonCipher Profile',
    targetId: 'NeonCipher',
    targetPath: '/author/NeonCipher',
    timestamp: Date.now() - 1000 * 60 * 3, // 3 mins ago
    metadata: { marqsAmount: 50, details: 'Initialized archival wallet' }
  },
  {
    id: 'ledger_seed_02',
    action: 'newsletter_signup',
    title: 'New subscriber joined the Marqs Promo Network newsletter',
    actor: 'Anonymous Reader',
    targetTitle: 'Marqs Membership',
    targetPath: '/newsletter',
    timestamp: Date.now() - 1000 * 60 * 7, // 7 mins ago
    metadata: { marqsAmount: 3000, usdValue: 3.00, details: '$3.00 Marqs Welcome Credit Allocated' }
  },
  {
    id: 'ledger_seed_03',
    action: 'boost',
    title: 'Applied X4 Buy Back Boost (+4 spots in GUIDES & HOW-TOS)',
    actor: 'CyberScribe',
    targetTitle: 'GUIDES & HOW-TOS',
    targetId: 'GUIDES & HOW-TOS',
    targetPath: '/?category=GUIDES%20%26%20HOW-TOS',
    timestamp: Date.now() - 1000 * 60 * 15, // 15 mins ago
    metadata: { tier: 'X4', genre: 'GUIDES & HOW-TOS', marqsAmount: 2000 }
  },
  {
    id: 'ledger_seed_04',
    action: 'read_page',
    title: 'Read Page 12 of "Cyberpunk Systems & Field Manual"',
    actor: 'Archivist_404',
    targetTitle: 'Cyberpunk Systems & Field Manual',
    targetId: 'manual_01',
    targetPath: '/read/manual_01',
    timestamp: Date.now() - 1000 * 60 * 22,
    metadata: { page: 12, totalPages: 48, marqsAmount: 0.25 }
  },
  {
    id: 'ledger_seed_05',
    action: 'comment',
    title: 'Left technical critique: "Essential reference for archival node verification"',
    actor: 'VoxelMind',
    targetTitle: 'The Zetsu Chronicles Vol. 1',
    targetId: 'zetsu_vol1',
    targetPath: '/book/zetsu_vol1',
    timestamp: Date.now() - 1000 * 60 * 35,
    metadata: { marqsAmount: 5 }
  },
  {
    id: 'ledger_seed_06',
    action: 'share',
    title: 'Shared public bitstream permalink for "Neural Architectures: 2026 Edition"',
    actor: 'DataDrifter',
    targetTitle: 'Neural Architectures: 2026 Edition',
    targetId: 'neural_arch',
    targetPath: '/book/neural_arch',
    timestamp: Date.now() - 1000 * 60 * 50,
    metadata: { marqsAmount: 5 }
  },
  {
    id: 'ledger_seed_07',
    action: 'buy_copies',
    title: 'Ordered 2x Hardcover Print Edition of "The Archival Codex"',
    actor: 'Collector_99',
    targetTitle: 'The Archival Codex',
    targetId: 'archival_codex',
    targetPath: '/book/archival_codex',
    timestamp: Date.now() - 1000 * 60 * 75,
    metadata: { copies: 2, format: 'hard_photo', usdValue: 99.98, marqsAmount: 25 }
  },
  {
    id: 'ledger_seed_08',
    action: 'upload',
    title: 'Published new book "Autonomous Protocols & Distributed Archives"',
    actor: 'Kevin Suber',
    targetTitle: 'Autonomous Protocols & Distributed Archives',
    targetId: 'auto_proto',
    targetPath: '/book/auto_proto',
    timestamp: Date.now() - 1000 * 60 * 110,
    metadata: { genre: 'RESEARCH & PAPERS', totalPages: 64, marqsAmount: 10 }
  },
  {
    id: 'ledger_seed_09',
    action: 'view',
    title: 'Viewed book archive "The Art of Zetsu Digital Artifacts"',
    actor: 'Guest_Archivist',
    targetTitle: 'The Art of Zetsu Digital Artifacts',
    targetId: 'art_zetsu',
    targetPath: '/book/art_zetsu',
    timestamp: Date.now() - 1000 * 60 * 140,
    metadata: { marqsAmount: 5 }
  },
  {
    id: 'ledger_seed_10',
    action: 'read_page',
    title: 'Read Page 3 of "Introduction to Quantum Storytelling"',
    actor: 'QuantumReader',
    targetTitle: 'Introduction to Quantum Storytelling',
    targetId: 'quant_story',
    targetPath: '/read/quant_story',
    timestamp: Date.now() - 1000 * 60 * 180,
    metadata: { page: 3, totalPages: 32, marqsAmount: 0.25 }
  }
];

/**
 * Get local cached ledger entries
 */
export const getLocalLedgerEntries = (): LedgerEntry[] => {
  try {
    const raw = localStorage.getItem(LEDGER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read ledger from localStorage:', err);
  }

  // Initialize with seed entries if nothing in cache
  try {
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(SEED_LEDGER_ENTRIES));
  } catch {}

  return SEED_LEDGER_ENTRIES;
};

/**
 * Save entry to local cache
 */
const saveLocalLedgerEntry = (entry: LedgerEntry): void => {
  try {
    const current = getLocalLedgerEntries();
    // Avoid duplicates by ID
    const filtered = current.filter(e => e.id !== entry.id);
    const updated = [entry, ...filtered].slice(0, MAX_LOCAL_ENTRIES);
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save ledger entry locally:', err);
  }
};

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
 * Public function to record an action to The Ledger
 * Writes to Supabase and local cache, and triggers a window event for real-time subscribers.
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
  const id = 'ldg_' + timestamp + '_' + Math.random().toString(36).substring(2, 7);

  const entry: LedgerEntry = {
    id,
    action: params.action,
    title,
    actor,
    targetTitle: params.targetTitle,
    targetId: params.targetId,
    targetPath: params.targetPath,
    timestamp,
    metadata: params.metadata
  };

  // 1. Immediately cache locally
  saveLocalLedgerEntry(entry);

  // 2. Dispatch real-time UI event
  window.dispatchEvent(new CustomEvent('zetsu-ledger-entry-added', { detail: entry }));

  // 3. Persist to Supabase if configured
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('ledger_entries')
        .upsert([{
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
        }], { onConflict: 'id' });

      if (error && !error.message?.includes('does not exist')) {
        console.warn('Supabase ledger_entries insertion issue:', error);
      }
    } catch (err) {
      console.warn('Supabase ledger recording deferred to local cache:', err);
    }
  }

  return entry;
};

/**
 * Fetches paginated ledger entries from Supabase with graceful local fallback and merge.
 */
export const getLedgerEntries = async (
  page: number = 1,
  limit: number = 20,
  actionFilter?: string
): Promise<{ entries: LedgerEntry[]; hasMore: boolean; total: number }> => {
  const supabase = getSupabase();
  const localEntries = getLocalLedgerEntries();

  let remoteEntries: LedgerEntry[] = [];
  let totalCount = localEntries.length;

  if (supabase) {
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

      if (!error && data && data.length > 0) {
        remoteEntries = data.map(row => ({
          id: row.id,
          action: row.action as LedgerActionType,
          title: row.title,
          actor: row.actor,
          targetTitle: row.target_title || undefined,
          targetId: row.target_id || undefined,
          targetPath: row.target_path,
          timestamp: typeof row.timestamp === 'number' 
            ? row.timestamp 
            : (isNaN(Number(row.timestamp)) ? new Date(row.timestamp).getTime() : Number(row.timestamp)),
          metadata: row.metadata || {}
        }));
        if (count !== null) totalCount = count;
      }
    } catch (err) {
      console.warn('Supabase ledger fetch failed, using local stream:', err);
    }
  }

  // Combine and deduplicate remote and local
  const combinedMap = new Map<string, LedgerEntry>();
  remoteEntries.forEach(e => combinedMap.set(e.id, e));
  localEntries.forEach(e => {
    if (!combinedMap.has(e.id)) {
      combinedMap.set(e.id, e);
    }
  });

  let allEntries = Array.from(combinedMap.values()).sort((a, b) => b.timestamp - a.timestamp);

  if (actionFilter && actionFilter !== 'all') {
    allEntries = allEntries.filter(e => e.action === actionFilter);
  }

  const offset = (page - 1) * limit;
  const pagedEntries = allEntries.slice(offset, offset + limit);
  const hasMore = offset + limit < allEntries.length;

  return {
    entries: pagedEntries,
    hasMore,
    total: allEntries.length
  };
};

/**
 * Get aggregated ledger stats for dashboard & live header metrics
 */
export const getLedgerStats = async () => {
  const { entries } = await getLedgerEntries(1, 100);
  const now = Date.now();
  const recentCutoff = now - 1000 * 60 * 60; // 1 hour
  const recentEvents = entries.filter(e => e.timestamp > recentCutoff);

  const actionCounts: Record<string, number> = {};
  entries.forEach(e => {
    actionCounts[e.action] = (actionCounts[e.action] || 0) + 1;
  });

  return {
    totalEntries: entries.length,
    recentHourVelocity: recentEvents.length,
    actionCounts,
    actionsPerMinute: (recentEvents.length / 60).toFixed(1)
  };
};
