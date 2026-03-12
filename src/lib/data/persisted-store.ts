export function loadStoredValue<T>(key: string, seed: () => T): T {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return seed();
    return JSON.parse(raw) as T;
  } catch {
    return seed();
  }
}

export function saveStoredValue<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/storage failures in demo mode.
  }
}

export function removeStoredValue(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore cleanup failures in demo mode.
  }
}

export function updateStoredCollection<T extends { id: string }>(
  key: string,
  seed: () => T[],
  id: string,
  updater: (item: T) => T
): T | null {
  const items = loadStoredValue<T[]>(key, seed);
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const updated = updater(items[index]);
  const next = [...items];
  next[index] = updated;
  saveStoredValue(key, next);
  return updated;
}

export function appendStoredItem<T>(
  key: string,
  seed: () => T[],
  item: T,
  prepend = false
): T[] {
  const items = loadStoredValue<T[]>(key, seed);
  const next = prepend ? [item, ...items] : [...items, item];
  saveStoredValue(key, next);
  return next;
}

