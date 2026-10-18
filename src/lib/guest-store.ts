// Plans for visitors who aren't signed in live in this browser's localStorage instead of the database.
// Every read/write is wrapped: private mode or blocked storage must never break the page.

export type GuestBlob<T> = { nextId: number; items: T[] };

export function readGuest<T extends { id: number }>(key: string): GuestBlob<T> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.items)) {
        const maxId = data.items.reduce((m: number, x: T) => Math.max(m, x.id), 0);
        return { nextId: Math.max(Number(data.nextId) || 1, maxId + 1), items: data.items };
      }
    }
  } catch {
    /* corrupt or unavailable: start empty */
  }
  return { nextId: 1, items: [] };
}

// returns false when the browser refused to store it (quota, private mode)
export function writeGuest<T>(key: string, blob: GuestBlob<T>): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(blob));
    return true;
  } catch {
    return false;
  }
}

export const GUEST_MEALS_KEY = "bw-guest-meal-plan";
export const GUEST_WORKOUTS_KEY = "bw-guest-workouts";
