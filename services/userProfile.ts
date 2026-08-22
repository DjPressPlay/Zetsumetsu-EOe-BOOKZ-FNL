import { getSupabase } from './supabase';
import { getDeviceId, getStoredIp, setStoredIp, setCanonicalDeviceId } from './deviceId';
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
 * Retrieve user profile from cache, with immediate IP recovery fallback and background Supabase IP sync
 */
export const getUserProfile = (targetDeviceId?: string): UserProfile => {
  const currentIp = cachedIp || getStoredIp() || '';
  const deviceId = targetDeviceId || getDeviceId();
  const key = getProfileStorageKey(deviceId);

  // 1. Try reading from deviceId key
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

  // 2. If no profile for deviceId, check if an account for this IP already exists locally
  if (currentIp && currentIp !== '127.0.0.1') {
    try {
      const ipRaw = localStorage.getItem(`${PROFILE_STORAGE_KEY_PREFIX}ip_${currentIp}`);
      if (ipRaw) {
        const parsedIp = JSON.parse(ipRaw);
        if (parsedIp.deviceId) {
          setCanonicalDeviceId(parsedIp.deviceId);
        }
        return {
          id: parsedIp.id || deviceId,
          deviceId: parsedIp.deviceId || deviceId,
          ipAddress: currentIp,
          authorName: parsedIp.authorName || currentIp,
          walletPasswordHash: parsedIp.walletPasswordHash,
          hasPassword: !!parsedIp.walletPasswordHash,
          marqsBalance: Number(parsedIp.marqsBalance ?? 50),
          totalEarned: Number(parsedIp.totalEarned ?? 50),
          totalSpent: Number(parsedIp.totalSpent ?? 0),
          uploadedBooks: Array.isArray(parsedIp.uploadedBooks) ? parsedIp.uploadedBooks : [],
          transactions: Array.isArray(parsedIp.transactions) ? parsedIp.transactions : [],
          createdAt: parsedIp.createdAt || Date.now(),
          lastActive: Date.now()
        };
      }
    } catch {}
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

  // Sync with Supabase in background to pull existing IP account or enforce single-account-per-IP
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
    if (profile.ipAddress && profile.ipAddress !== '127.0.0.1') {
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
 * Synchronizes user profile with Supabase by Public IP Address:
 * 1. Strictly enforces 1 account per IP address.
 * 2. If multiple accounts exist for this IP, automatically keeps the one with the highest Marqs balance
 *    and deletes duplicate lower-balance accounts from Supabase.
 * 3. If a new user/device connects from this IP, immediately pulls and adopts the existing account.
 */
export const syncProfileWithSupabase = async (localProfile?: UserProfile): Promise<UserProfile> => {
  const profile = localProfile || getUserProfile();
  const supabase = getSupabase();
  if (!supabase) return profile;

  try {
    const ip = profile.ipAddress || await getClientIp();
    
    // Check tables in order: bookz_user_profiles first, then user_profiles
    let tableName = 'bookz_user_profiles';
    let remoteRecords: any[] = [];
    let fetchError: any = null;

    // 1. Primary lookup of ALL accounts associated with this Public IP Address
    if (ip && ip !== '127.0.0.1') {
      const ipQuery = await supabase
        .from(tableName)
        .select('*')
        .eq('ip_address', ip);

      if (ipQuery.error && ipQuery.error.message?.includes('does not exist')) {
        tableName = 'user_profiles';
        const fallbackIpQuery = await supabase
          .from(tableName)
          .select('*')
          .eq('ip_address', ip);
        remoteRecords = fallbackIpQuery.data || [];
        fetchError = fallbackIpQuery.error;
      } else {
        remoteRecords = ipQuery.data || [];
        fetchError = ipQuery.error;
      }
    }

    // 2. Secondary lookup by deviceId if not matched by IP
    if (remoteRecords.length === 0 && profile.deviceId) {
      const deviceQuery = await supabase
        .from(tableName)
        .select('*')
        .eq('device_id', profile.deviceId);
      
      if (deviceQuery.data && deviceQuery.data.length > 0) {
        remoteRecords = deviceQuery.data;
      }
    }

    if (fetchError && !fetchError.message?.includes('does not exist')) {
      console.warn(`Supabase ${tableName} fetch error:`, fetchError);
    }

    if (remoteRecords.length > 0) {
      // Sort accounts by Marqs balance descending, breaking ties with most recent activity
      const sorted = [...remoteRecords].sort((a: any, b: any) => {
        const balanceA = Number(a.marqs_balance) || 0;
        const balanceB = Number(b.marqs_balance) || 0;
        if (balanceB !== balanceA) return balanceB - balanceA;
        const timeA = new Date(a.last_active || a.created_at || 0).getTime();
        const timeB = new Date(b.last_active || b.created_at || 0).getTime();
        return timeB - timeA;
      });

      // The account with the highest balance is our single canonical account
      const keeper = sorted[0];
      const duplicates = sorted.slice(1);

      // Collect and merge all uploaded books across duplicates so no user work is lost
      const mergedBooksMap = new Map<string, UploadedBookRef>();
      if (Array.isArray(keeper.uploaded_books)) {
        keeper.uploaded_books.forEach((b: any) => { if (b && b.id) mergedBooksMap.set(b.id, b); });
      }
      (profile.uploadedBooks || []).forEach(b => { if (b && b.id) mergedBooksMap.set(b.id, b); });

      duplicates.forEach((dup: any) => {
        if (Array.isArray(dup.uploaded_books)) {
          dup.uploaded_books.forEach((b: any) => { if (b && b.id) mergedBooksMap.set(b.id, b); });
        }
      });

      // Auto-delete duplicate accounts with lower Marqs balance from Supabase
      if (duplicates.length > 0) {
        const duplicateIds = duplicates.map((d: any) => d.id).filter(Boolean);
        if (duplicateIds.length > 0) {
          console.info(`[Zetsu IP Enforcement] Deleting ${duplicateIds.length} duplicate lower-balance account(s) for IP ${ip}:`, duplicateIds);
          await supabase.from(tableName).delete().in('id', duplicateIds);
          try {
            await supabase.from('user_profiles').delete().in('id', duplicateIds);
          } catch {}
        }
      }

      // Adopt keeper's device ID as the canonical device ID for this node
      const canonicalDeviceId = keeper.device_id || keeper.id || profile.deviceId;
      setCanonicalDeviceId(canonicalDeviceId);

      // Determine author name
      let resolvedAuthorName = profile.authorName;
      const isCurrentDefault = !resolvedAuthorName || resolvedAuthorName === 'Anonymous Archivist' || resolvedAuthorName === ip;
      if (isCurrentDefault) {
        if (keeper.author_name && keeper.author_name !== 'Anonymous Archivist') {
          resolvedAuthorName = keeper.author_name;
        } else if (ip && ip !== '127.0.0.1') {
          resolvedAuthorName = ip;
        }
      }

      const mergedProfile: UserProfile = {
        id: keeper.id,
        deviceId: canonicalDeviceId,
        ipAddress: ip || keeper.ip_address || '',
        authorName: resolvedAuthorName,
        walletPasswordHash: keeper.wallet_password_hash || profile.walletPasswordHash || undefined,
        hasPassword: !!(keeper.wallet_password_hash || profile.walletPasswordHash),
        marqsBalance: Math.max(Number(profile.marqsBalance) || 0, Number(keeper.marqs_balance) || 0),
        totalEarned: Math.max(Number(profile.totalEarned) || 0, Number(keeper.total_earned) || 0),
        totalSpent: Math.max(Number(profile.totalSpent) || 0, Number(keeper.total_spent) || 0),
        uploadedBooks: Array.from(mergedBooksMap.values()),
        transactions: (Array.isArray(keeper.transactions) && keeper.transactions.length > 0)
          ? keeper.transactions
          : (profile.transactions || []),
        createdAt: keeper.created_at ? new Date(keeper.created_at).getTime() : profile.createdAt,
        lastActive: Date.now()
      };

      // Save pulled/merged profile locally
      const key = getProfileStorageKey(mergedProfile.deviceId);
      localStorage.setItem(key, JSON.stringify(mergedProfile));
      if (ip && ip !== '127.0.0.1') {
        localStorage.setItem(`${PROFILE_STORAGE_KEY_PREFIX}ip_${ip}`, JSON.stringify(mergedProfile));
      }
      localStorage.setItem(`zetsu_marqs_${mergedProfile.deviceId}`, JSON.stringify({
        balance: mergedProfile.marqsBalance,
        totalEarned: mergedProfile.totalEarned,
        totalSpent: mergedProfile.totalSpent,
        transactions: mergedProfile.transactions
      }));

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

      // Update keeper in Supabase to sync final state and ensure single-IP binding
      await supabase
        .from(tableName)
        .upsert({
          id: keeper.id,
          device_id: canonicalDeviceId,
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
      // First visit on this IP: Ensure no race condition before inserting new record
      if (ip && ip !== '127.0.0.1') {
        const doubleCheck = await supabase
          .from(tableName)
          .select('id')
          .eq('ip_address', ip)
          .limit(1);

        if (doubleCheck.data && doubleCheck.data.length > 0) {
          // Record was created in another tab/request: pull it immediately
          return syncProfileWithSupabase(profile);
        }
      }

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

