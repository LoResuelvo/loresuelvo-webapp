export interface DraftFileMeta {
  name: string;
  size: number;
  type: string;
}

export interface DraftSnapshot {
  text: string;
  files: DraftFileMeta[];
}

const STORAGE_KEY = "messageDrafts";
const memoryFallback = new Map<string, DraftSnapshot>();

function getStore(): Map<string, DraftSnapshot> {
  if (typeof window === "undefined") return memoryFallback;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, DraftSnapshot>;
    return new Map(Object.entries(parsed));
  } catch {
    return memoryFallback;
  }
}

function persistStore(store: Map<string, DraftSnapshot>): void {
  if (typeof window === "undefined") return;
  try {
    const obj = Object.fromEntries(store.entries());
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // ignore quota errors
  }
}

export function saveDraft(
  conversationId: string,
  text: string,
  files: DraftFileMeta[]
): void {
  const store = getStore();
  store.set(conversationId, {
    text,
    files: files.map((f) => ({ ...f })),
  });
  persistStore(store);
}

export function loadDraft(conversationId: string): DraftSnapshot {
  const store = getStore();
  const draft = store.get(conversationId);
  if (!draft) return { text: "", files: [] };
  return {
    text: draft.text,
    files: draft.files.map((f) => ({ ...f })),
  };
}

export function clearDraft(conversationId: string): void {
  const store = getStore();
  store.delete(conversationId);
  persistStore(store);
}

export function hasDraft(conversationId: string): boolean {
  const store = getStore();
  return store.has(conversationId);
}