const CANONICAL_KEY = 'ZETSU_DEVICE_ID';
const LEGACY_KEY = 'zetsu_device_id';
const LEGACY_BACKUP_KEY = 'ZETSU_LEGACY_DEVICE_ID';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value: string | null): value is string => !!value && UUID_PATTERN.test(value);

/**
 * The canonical identifier for this browser.
 *
 * It must be a UUID: user_credits.user_id and upvotes_log.user_id are both uuid
 * columns, so any other shape is rejected by Postgres with error 22P02 before the
 * query ever runs. Older builds stored a random base36 string under a differently
 * cased key, which is why those two tables silently stopped working.
 */
export const getDeviceId = (): string => {
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
 * Every id this browser has ever used, for tables keyed by text (bookz.user_id).
 * Without this, migrating to a UUID would orphan a user's existing uploads.
 */
export const getDeviceIdHistory = (): string[] => {
  const ids = [getDeviceId()];
  for (const key of [LEGACY_KEY, LEGACY_BACKUP_KEY]) {
    const value = localStorage.getItem(key);
    if (value && !ids.includes(value)) ids.push(value);
  }
  return ids;
};
