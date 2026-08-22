import { getSupabase } from './supabase';
import { getDeviceId, getStoredIp, setStoredIp } from './deviceId';
import { UserProfile, UploadedBookRef, MarqsTransaction, MarqsAction, MARQS_EARNING_RATES, MARQS_PER_USD } from '../types';
import { recordLedgerAction } from './ledger';

const PROFILE_STORAGE_KEY_PREFIX = 'zetsu_user_profile_';
const WALLET_UNLOCKED_SESSION_KEY = 'zetsu_wallet_unlocked';

/**
 * SHA-256 password hash generator using Web Crypto API
 */
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Fetch client public IP address with server route and public fallback
 */
let cachedIp: string = getStoredIp() || '';
export const getClientIp = async (): Promise<string> => {
  if (cachedIp && cachedIp !== '127.0.0.1') return cachedIp;
  try {
    const res = await fetch('/api/client-ip');
    if (res.ok) {
      const data = await res.json();
      if (data.ip && data.ip !== '127.0.0.1') {
        cachedIp = data.ip;
        setStoredIp(data.ip);
        return data.ip;
      }
    }
  } catch {}

  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (res.ok) {
      const data = await res.json();
      if (data.ip) {
        cachedIp = data.ip;
        setStoredIp(data.ip);
        return data.ip;
      }
    }
  } catch {}

  cachedIp = cachedIp || '127.0.0.1';
  return cachedIp;
};

const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

// Start resolving public IP immediately and sync with Supabase (browser only)
if (isBrowser) {
  getClientIp().then(ip => {
    if (ip) {
      const profile = getUserProfile();
      if (!profile.authorName || profile.authorName === 'Anonymous Archivist') {
        profile.authorName = ip;
        profile.ipAddress = ip;
        saveUserProfile(profile);
      }
      syncProfileWithSupabase(profile).catch(() => {});
    }
  }).catch(() => {});
}

const getProfileStorageKey = (deviceId: string) => `${PROFILE_STORAGE_KEY_PREFIX}${deviceId}`;

/**
 * Format default temporary username based on IP address
 */
const getDefaultAuthorName = (ip?: string): string => {
  const effectiveIp = ip || cachedIp || getStoredIp();
  if (effectiveIp && effectiveIp !== '127.0.0.1') {
    return effectiveIp;
  }
  return 'Anonymous Archivist';
};

/**
 * Retrieve user profile from cache, with background Supabase IP sync
 */
export const getUserProfile = (targetDeviceId?: string): UserProfile => {
  const deviceId = targetDeviceId || getDeviceId();
  const key = getProfileStorageKey(deviceId);
  const currentIp = cachedIp || getStoredIp() || '';

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const isDefaultName = !parsed.authorName || parsed.authorName === 'Anonymous Archivist';
      const resolvedName = isDefaultName && currentIp ? currentIp : (parsed.authorName || getDefaultAuthorName(currentIp));

      return {
        id: parsed.id || deviceId,
        deviceId: parsed.deviceId || deviceId,
        ipAddress: parsed.ipAddress || currentIp,
        authorName: resolvedName,
        walletPasswordHash: parsed.walletPasswordHash,
        hasPassword: !!parsed.walletPasswordHash,
        marqsBalance: Number(parsed.marqsBalance ?? parsed.balance ?? 50),
        totalEarned: Number(parsed.totalEarned ?? 50),
        totalSpent: Number(parsed.totalSpent ?? 0),
        uploadedBooks: Array.isArray(parsed.uploadedBooks) ? parsed.uploadedBooks : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        createdAt: parsed.createdAt || Date.now(),
        lastActive: Date.now()
      };
    }
  } catch (err) {
    console.error('Error reading UserProfile from cache:', err);
  }

  // Check if legacy Marqs profile exists
  let legacyBalance = 50;
  let legacyEarned = 50;
  let legacySpent = 0;
  let legacyTx: MarqsTransaction[] = [];
  try {
    const legacyRaw = localStorage.getItem(`zetsu_marqs_${deviceId}`);
    if (legacyRaw) {
      const parsedLegacy = JSON.parse(legacyRaw);
      legacyBalance = Number(parsedLegacy.balance) || 50;
      legacyEarned = Number(parsedLegacy.totalEarned) || 50;
      legacySpent = Number(parsedLegacy.totalSpent) || 0;
      if (Array.isArray(parsedLegacy.transactions)) legacyTx = parsedLegacy.transactions;
    }
  } catch {}

  const initialProfile: UserProfile = {
    id: deviceId,
    deviceId,
    ipAddress: currentIp,
    authorName: getDefaultAuthorName(currentIp),
    walletPasswordHash: undefined,
    hasPassword: false,
    marqsBalance: legacyBalance,
    totalEarned: legacyEarned,
    totalSpent: legacySpent,
    uploadedBooks: [],
    transactions: legacyTx.length > 0 ? legacyTx : [
      {
        id: 'tx_init_' + Date.now(),
        action: 'bonus',
        amount: 50,
        usdValue: 0.05,
        timestamp: Date.now(),
        details: 'Initial Marq Starter Allocation (Zetsu EOE Bookz)'
      }
    ],
    createdAt: Date.now(),
    lastActive: Date.now()
  };

  try {
    localStorage.setItem(key, JSON.stringify(initialProfile));
  } catch {}

  // Sync with Supabase in background to restore previous account state if returning via IP
  syncProfileWithSupabase(initialProfile).catch(() => {});

  return initialProfile;
};

/**
 * Save user profile to local cache and sync to Supabase tables
 */
export const saveUserProfile = (profile: UserProfile): void => {
  const deviceId = profile.deviceId || getDeviceId();
  const key = getProfileStorageKey(deviceId);

  profile.hasPassword = !!profile.walletPasswordHash;
  profile.lastActive = Date.now();
  if (!profile.ipAddress && cachedIp) {
    profile.ipAddress = cachedIp;
  }

  try {
    localStorage.setItem(key, JSON.stringify(profile));
    // Keep secondary IP key updated for instant recovery on deviceId reset
    if (profile.ipAddress) {
      localStorage.setItem(`${PROFILE_STORAGE_KEY_PREFIX}ip_${profile.ipAddress}`, JSON.stringify(profile));
    }
    // Also keep legacy key synced for backwards compatibility
    localStorage.setItem(`zetsu_marqs_${deviceId}`, JSON.stringify({
      balance: profile.marqsBalance,
      totalEarned: profile.totalEarned,
      totalSpent: profile.totalSpent,
      transactions: profile.transactions
    }));

    window.dispatchEvent(new CustomEvent('zetsu-profile-updated', { detail: profile }));
    window.dispatchEvent(new CustomEvent('zetsu-marqs-updated', {
      detail: {
        balance: profile.marqsBalance,
        totalEarned: profile.totalEarned,
        totalSpent: profile.totalSpent,
        transactions: profile.transactions,
        authorName: profile.authorName,
        hasPassword: profile.hasPassword,
        uploadedBooks: profile.uploadedBooks
      }
    }));
  } catch (err) {
    console.error('Error caching UserProfile:', err);
  }

  // Push to Supabase
  syncProfileWithSupabase(profile).catch(err => {
    console.warn('Supabase UserProfile sync deferred:', err);
  });
};

/**
 * Synchronizes user profile with Supabase by Public IP Address (with deviceId fallback).
 * This recovers existing accounts, Marqs balances, and uploaded manuscripts even if browser cache was cleared.
 */
export const syncProfileWithSupabase = async (localProfile?: UserProfile): Promise<UserProfile> => {
  const profile = localProfile || getUserProfile();
  const supabase = getSupabase();
  if (!supabase) return profile;

  try {
    const ip = profile.ipAddress || await getClientIp();
    
    // Check tables in order: bookz_user_profiles first, then user_profiles
    let tableName = 'bookz_user_profiles';
    let remoteData: any = null;
    let fetchError: any = null;

    // 1. Primary lookup by IP Address
    if (ip && ip !== '127.0.0.1') {
      const ipQuery = await supabase
        .from(tableName)
        .select('*')
        .eq('ip_address', ip)
        .order('last_active', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ipQuery.error && ipQuery.error.message?.includes('does not exist')) {
        tableName = 'user_profiles';
        const fallbackIpQuery = await supabase
          .from(tableName)
          .select('*')
          .eq('ip_address', ip)
          .order('last_active', { ascending: false })
          .limit(1)
          .maybeSingle();
        remoteData = fallbackIpQuery.data;
        fetchError = fallbackIpQuery.error;
      } else {
        remoteData = ipQuery.data;
        fetchError = ipQuery.error;
      }
    }

    // 2. Secondary lookup by deviceId if not matched by IP
    if (!remoteData && profile.deviceId) {
      const deviceQuery = await supabase
        .from(tableName)
        .select('*')
        .eq('device_id', profile.deviceId)
        .maybeSingle();
      
      if (deviceQuery.data) {
        remoteData = deviceQuery.data;
      }
    }

    if (fetchError && !fetchError.message?.includes('does not exist')) {
      console.warn(`Supabase ${tableName} fetch error:`, fetchError);
    }

    if (remoteData) {
      // Merge remote data with local data (highest balance and combined manuscripts)
      const mergedBooksMap = new Map<string, UploadedBookRef>();
      (profile.uploadedBooks || []).forEach(b => mergedBooksMap.set(b.id, b));
      if (Array.isArray(remoteData.uploaded_books)) {
        remoteData.uploaded_books.forEach((b: any) => {
          if (b && b.id) mergedBooksMap.set(b.id, b);
        });
      }

      // Determine author name: if user configured a custom name, keep it; otherwise use remote name or fallback to IP
      let resolvedAuthorName = profile.authorName;
      const isCurrentDefault = !resolvedAuthorName || resolvedAuthorName === 'Anonymous Archivist' || resolvedAuthorName === ip;
      if (isCurrentDefault) {
        if (remoteData.author_name && remoteData.author_name !== 'Anonymous Archivist') {
          resolvedAuthorName = remoteData.author_name;
        } else if (ip && ip !== '127.0.0.1') {
          resolvedAuthorName = ip;
        }
      }

      const mergedProfile: UserProfile = {
        id: profile.deviceId || remoteData.id || `ip_${ip}`,
        deviceId: profile.deviceId || remoteData.device_id || `dev_${ip}`,
        ipAddress: ip || remoteData.ip_address || '',
        authorName: resolvedAuthorName,
        walletPasswordHash: profile.walletPasswordHash || remoteData.wallet_password_hash || undefined,
        hasPassword: !!(profile.walletPasswordHash || remoteData.wallet_password_hash),
        marqsBalance: Math.max(Number(profile.marqsBalance) || 0, Number(remoteData.marqs_balance) || 0),
        totalEarned: Math.max(Number(profile.totalEarned) || 0, Number(remoteData.total_earned) || 0),
        totalSpent: Math.max(Number(profile.totalSpent) || 0, Number(remoteData.total_spent) || 0),
        uploadedBooks: Array.from(mergedBooksMap.values()),
        transactions: (profile.transactions && profile.transactions.length > 0) 
          ? profile.transactions 
          : (Array.isArray(remoteData.transactions) ? remoteData.transactions : []),
        createdAt: remoteData.created_at ? new Date(remoteData.created_at).getTime() : profile.createdAt,
        lastActive: Date.now()
      };

      // Save locally
      const key = getProfileStorageKey(mergedProfile.deviceId);
      localStorage.setItem(key, JSON.stringify(mergedProfile));
      if (ip) {
        localStorage.setItem(`${PROFILE_STORAGE_KEY_PREFIX}ip_${ip}`, JSON.stringify(mergedProfile));
      }

      // Trigger UI updates
      window.dispatchEvent(new CustomEvent('zetsu-profile-updated', { detail: mergedProfile }));
      window.dispatchEvent(new CustomEvent('zetsu-marqs-updated', {
        detail: {
          balance: mergedProfile.marqsBalance,
          totalEarned: mergedProfile.totalEarned,
          totalSpent: mergedProfile.totalSpent,
          transactions: mergedProfile.transactions,
          authorName: mergedProfile.authorName,
          hasPassword: mergedProfile.hasPassword,
          uploadedBooks: mergedProfile.uploadedBooks
        }
      }));

      // Push merged state back to Supabase
      const upsertId = remoteData.id || profile.deviceId;
      await supabase
        .from(tableName)
        .upsert({
          id: upsertId,
          device_id: mergedProfile.deviceId,
          ip_address: ip,
          author_name: mergedProfile.authorName,
          wallet_password_hash: mergedProfile.walletPasswordHash || null,
          marqs_balance: mergedProfile.marqsBalance,
          total_earned: mergedProfile.totalEarned,
          total_spent: mergedProfile.totalSpent,
          uploaded_books: mergedProfile.uploadedBooks,
          transactions: mergedProfile.transactions.slice(0, 50),
          last_active: new Date().toISOString()
        }, { onConflict: 'id' });

      return mergedProfile;
    } else {
      // First visit on this IP: Insert new record into Supabase
      const rowId = profile.deviceId || (ip ? `ip_${ip}` : crypto.randomUUID());
      const tempAuthorName = (profile.authorName && profile.authorName !== 'Anonymous Archivist') 
        ? profile.authorName 
        : (ip || 'Anonymous Archivist');

      const { error: insertError } = await supabase
        .from(tableName)
        .insert([{
          id: rowId,
          device_id: profile.deviceId,
          ip_address: ip,
          author_name: tempAuthorName,
          wallet_password_hash: profile.walletPasswordHash || null,
          marqs_balance: profile.marqsBalance,
          total_earned: profile.totalEarned,
          total_spent: profile.totalSpent,
          uploaded_books: profile.uploadedBooks || [],
          transactions: profile.transactions.slice(0, 50),
          created_at: new Date(profile.createdAt).toISOString(),
          last_active: new Date().toISOString()
        }]);

      if (insertError && !insertError.message?.includes('does not exist')) {
        console.warn(`Failed to insert into ${tableName} on Supabase:`, insertError);
      }
    }
  } catch (err) {
    console.warn('Supabase profile sync background error:', err);
  }

  return profile;
};

/**
 * Set or update the wallet password & author name (transitions user from temp IP to registered custom wallet)
 */
export const setWalletPassword = async (password: string, authorName?: string): Promise<UserProfile> => {
  const profile = getUserProfile();
  const hash = await hashPassword(password);
  
  profile.walletPasswordHash = hash;
  profile.hasPassword = true;
  if (authorName && authorName.trim()) {
    profile.authorName = authorName.trim();
  }

  saveUserProfile(profile);
  unlockWalletSession();

  return profile;
};

/**
 * Check if the provided password matches the wallet hash
 */
export const verifyWalletPassword = async (password: string): Promise<boolean> => {
  const profile = getUserProfile();
  if (!profile.walletPasswordHash) return true; // No password set

  const hash = await hashPassword(password);
  const isValid = hash === profile.walletPasswordHash;
  if (isValid) {
    unlockWalletSession();
  }
  return isValid;
};

/**
 * Session unlock management
 */
export const isWalletUnlocked = (): boolean => {
  const profile = getUserProfile();
  if (!profile.walletPasswordHash) return true; // Unprotected wallet
  if (typeof sessionStorage === 'undefined') return true;
  return sessionStorage.getItem(WALLET_UNLOCKED_SESSION_KEY) === 'true';
};

export const unlockWalletSession = (): void => {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(WALLET_UNLOCKED_SESSION_KEY, 'true');
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zetsu-wallet-unlocked', { detail: true }));
  }
};

export const lockWalletSession = (): void => {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(WALLET_UNLOCKED_SESSION_KEY);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zetsu-wallet-unlocked', { detail: false }));
  }
};

/**
 * Update author name alias
 */
export const setAuthorName = (name: string): UserProfile => {
  const profile = getUserProfile();
  const cleanName = name.trim() || getDefaultAuthorName(profile.ipAddress);
  const previousName = profile.authorName;
  profile.authorName = cleanName;
  saveUserProfile(profile);

  if (cleanName !== 'Anonymous Archivist' && cleanName !== previousName) {
    recordLedgerAction({
      action: 'join',
      actor: cleanName,
      targetTitle: `${cleanName}'s Profile`,
      targetId: cleanName,
      targetPath: `/author/${encodeURIComponent(cleanName)}`,
      title: `Archivist ${cleanName} initialized author entity profile`
    }).catch(() => {});
  }

  return profile;
};

/**
 * Track an uploaded book in the author's profile
 */
export const trackAuthorUploadedBook = (book: UploadedBookRef): UserProfile => {
  const profile = getUserProfile();
  const existingIndex = profile.uploadedBooks.findIndex(b => b.id === book.id);
  
  if (existingIndex >= 0) {
    profile.uploadedBooks[existingIndex] = { ...profile.uploadedBooks[existingIndex], ...book };
  } else {
    profile.uploadedBooks = [book, ...profile.uploadedBooks];
  }

  saveUserProfile(profile);
  return profile;
};

