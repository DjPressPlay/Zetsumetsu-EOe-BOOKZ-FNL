import { getSupabase } from './supabase';
import { getDeviceId } from './deviceId';
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
 * Fetch client IP address with server route and public fallback
 */
let cachedIp: string = '';
export const getClientIp = async (): Promise<string> => {
  if (cachedIp) return cachedIp;
  try {
    const res = await fetch('/api/client-ip');
    if (res.ok) {
      const data = await res.json();
      if (data.ip) {
        cachedIp = data.ip;
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
        return data.ip;
      }
    }
  } catch {}

  cachedIp = '127.0.0.1';
  return cachedIp;
};

// Start fetching IP early in background
getClientIp().catch(() => {});

const getProfileStorageKey = (deviceId: string) => `${PROFILE_STORAGE_KEY_PREFIX}${deviceId}`;

/**
 * Retrieve user profile from cache, with background Supabase sync
 */
export const getUserProfile = (targetDeviceId?: string): UserProfile => {
  const deviceId = targetDeviceId || getDeviceId();
  const key = getProfileStorageKey(deviceId);

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        id: parsed.id || deviceId,
        deviceId: parsed.deviceId || deviceId,
        ipAddress: parsed.ipAddress || cachedIp || '',
        authorName: parsed.authorName || 'Anonymous Archivist',
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
    ipAddress: cachedIp || '',
    authorName: 'Anonymous Archivist',
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

  // Sync to Supabase in background
  syncProfileWithSupabase(initialProfile).catch(() => {});

  return initialProfile;
};

/**
 * Save user profile to local cache and sync to Supabase table `user_profiles`
 */
export const saveUserProfile = (profile: UserProfile): void => {
  const deviceId = profile.deviceId || getDeviceId();
  const key = getProfileStorageKey(deviceId);

  profile.hasPassword = !!profile.walletPasswordHash;
  profile.lastActive = Date.now();

  try {
    localStorage.setItem(key, JSON.stringify(profile));
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
 * Asynchronously synchronizes user profile with Supabase (prioritizing `bookz_user_profiles` with fallback to `user_profiles`)
 */
export const syncProfileWithSupabase = async (localProfile?: UserProfile): Promise<UserProfile> => {
  const profile = localProfile || getUserProfile();
  const supabase = getSupabase();
  if (!supabase) return profile;

  try {
    const ip = profile.ipAddress || await getClientIp();
    
    // Check if table exists on Supabase (trying bookz_user_profiles first, then user_profiles)
    let tableName = 'bookz_user_profiles';
    let { data: remoteData, error: fetchError } = await supabase
      .from(tableName)
      .select('*')
      .eq('device_id', profile.deviceId)
      .maybeSingle();

    if (fetchError && fetchError.message?.includes('does not exist')) {
      tableName = 'user_profiles';
      const fallback = await supabase
        .from(tableName)
        .select('*')
        .eq('device_id', profile.deviceId)
        .maybeSingle();
      remoteData = fallback.data;
      fetchError = fallback.error;
    }

    if (fetchError && !fetchError.message?.includes('does not exist')) {
      console.warn(`Supabase ${tableName} fetch error:`, fetchError);
    }

    if (remoteData) {
      // Merge remote data with local data (highest balance and combined books)
      const mergedBooksMap = new Map<string, UploadedBookRef>();
      (profile.uploadedBooks || []).forEach(b => mergedBooksMap.set(b.id, b));
      if (Array.isArray(remoteData.uploaded_books)) {
        remoteData.uploaded_books.forEach((b: any) => {
          if (b && b.id) mergedBooksMap.set(b.id, b);
        });
      }

      const mergedProfile: UserProfile = {
        id: profile.deviceId,
        deviceId: profile.deviceId,
        ipAddress: ip || remoteData.ip_address || '',
        authorName: profile.authorName !== 'Anonymous Archivist' ? profile.authorName : (remoteData.author_name || profile.authorName),
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
      const key = getProfileStorageKey(profile.deviceId);
      localStorage.setItem(key, JSON.stringify(mergedProfile));

      // Push merged back to Supabase
      await supabase
        .from(tableName)
        .upsert({
          id: profile.deviceId,
          device_id: profile.deviceId,
          ip_address: ip,
          author_name: mergedProfile.authorName,
          wallet_password_hash: mergedProfile.walletPasswordHash || null,
          marqs_balance: mergedProfile.marqsBalance,
          total_earned: mergedProfile.totalEarned,
          total_spent: mergedProfile.totalSpent,
          uploaded_books: mergedProfile.uploadedBooks,
          transactions: mergedProfile.transactions.slice(0, 50),
          last_active: new Date().toISOString()
        }, { onConflict: 'device_id' });

      return mergedProfile;
    } else {
      // Insert new row into Supabase
      const { error: insertError } = await supabase
        .from(tableName)
        .insert([{
          id: profile.deviceId,
          device_id: profile.deviceId,
          ip_address: ip,
          author_name: profile.authorName,
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
 * Set or update the wallet password & author name
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
  return sessionStorage.getItem(WALLET_UNLOCKED_SESSION_KEY) === 'true';
};

export const unlockWalletSession = (): void => {
  sessionStorage.setItem(WALLET_UNLOCKED_SESSION_KEY, 'true');
  window.dispatchEvent(new CustomEvent('zetsu-wallet-unlocked', { detail: true }));
};

export const lockWalletSession = (): void => {
  sessionStorage.removeItem(WALLET_UNLOCKED_SESSION_KEY);
  window.dispatchEvent(new CustomEvent('zetsu-wallet-unlocked', { detail: false }));
};

/**
 * Update author name alias
 */
export const setAuthorName = (name: string): UserProfile => {
  const profile = getUserProfile();
  const cleanName = name.trim() || 'Anonymous Archivist';
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
