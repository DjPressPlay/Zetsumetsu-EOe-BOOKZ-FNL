const CANONICAL_KEY = 'ZETSU_DEVICE_ID';
const LEGACY_KEY = 'zetsu_device_id';
const LEGACY_BACKUP_KEY = 'ZETSU_LEGACY_DEVICE_ID';
const IP_STORAGE_KEY = 'ZETSU_USER_IP';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value: string | null): value is string => !!value && UUID_PATTERN.test(value);

const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

export const getStoredIp = (): string => {
  if (!isBrowser) return '';
  return localStorage.getItem(IP_STORAGE_KEY) || '';
};

export const setStoredIp = (ip: string): void => {
  if (!isBrowser) return;
  if (ip && ip !== '127.0.0.1') {
    localStorage.setItem(IP_STORAGE_KEY, ip.trim());
  }
};

/**
 * The canonical identifier for this browser / network node.
 */
export const getDeviceId = (): string => {
  if (!isBrowser) return 'server-node-id';

  const current = localStorage.getItem(CANONICAL_KEY);
  if (isUuid(current)) return current;

  const legacy = localStorage.getItem(LEGACY_KEY);
  if (isUuid(legacy)) {
    localStorage.setItem(CANONICAL_KEY, legacy);
    return legacy;
  }

  // Keep the old non-UUID id around so uploads made under it are still recognised.
  if (legacy) localStorage.setItem(LEGACY_BACKUP_KEY, legacy);

  const id = crypto.randomUUID();
  localStorage.setItem(CANONICAL_KEY, id);
  return id;
};

/**
 * Every id this browser or IP has ever used, for tables keyed by text (bookz.user_id).
 */
export const getDeviceIdHistory = (): string[] => {
  if (!isBrowser) return ['server-node-id'];
  const ids = [getDeviceId()];
  const storedIp = getStoredIp();
  if (storedIp && !ids.includes(storedIp)) ids.push(storedIp);

  for (const key of [LEGACY_KEY, LEGACY_BACKUP_KEY]) {
    const value = localStorage.getItem(key);
    if (value && !ids.includes(value)) ids.push(value);
  }
  return ids;
};

