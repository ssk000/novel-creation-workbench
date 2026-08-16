import { create } from 'zustand';
import { api } from './api';
import type { Novel, NovelMeta, Settings } from './types';

interface StoreState {
  novels: NovelMeta[];
  novel: Novel | null;
  settings: Settings | null;
  dirty: boolean;
  saving: boolean;
  error: string | null;

  loadNovels: () => Promise<void>;
  openNovel: (id: string) => Promise<void>;
  createNovel: (data: Partial<Novel>) => Promise<Novel>;
  createSample: () => Promise<Novel>;
  deleteNovel: (id: string) => Promise<void>;
  closeNovel: () => void;
  updateNovel: (mutator: (draft: Novel) => void) => void;
  saveNow: () => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: (s: Settings) => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const useStore = create<StoreState>((set, get) => ({
  novels: [],
  novel: null,
  settings: null,
  dirty: false,
  saving: false,
  error: null,

  loadNovels: async () => {
    const novels = await api.listNovels();
    set({ novels });
  },

  openNovel: async (id) => {
    const novel = await api.getNovel(id);
    set({ novel, dirty: false, error: null });
  },

  createNovel: async (data) => {
    const novel = await api.createNovel(data);
    set((s) => ({ novels: [metaOf(novel), ...s.novels.filter((n) => n.id !== novel.id)], novel }));
    return novel;
  },

  createSample: async () => {
    const novel = await api.createSample();
    set((s) => ({ novels: [metaOf(novel), ...s.novels.filter((n) => n.id !== novel.id)], novel }));
    return novel;
  },

  deleteNovel: async (id) => {
    await api.deleteNovel(id);
    set((s) => ({
      novels: s.novels.filter((n) => n.id !== id),
      novel: s.novel?.id === id ? null : s.novel,
    }));
  },

  closeNovel: () => {
    void get().saveNow();
    set({ novel: null, dirty: false });
  },

  updateNovel: (mutator) => {
    set((s) => {
      if (!s.novel) return {};
      const draft = structuredClone(s.novel);
      mutator(draft);
      return { novel: draft, dirty: true };
    });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void get().saveNow();
    }, 900);
  },

  saveNow: async () => {
    const { novel, dirty } = get();
    if (!novel || !dirty) return;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = undefined;
    }
    set({ saving: true });
    try {
      const saved = await api.saveNovel(novel);
      set((s) => ({
        novel: saved,
        dirty: false,
        novels: s.novels.map((n) => (n.id === saved.id ? metaOf(saved) : n)),
      }));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      set({ saving: false });
    }
  },

  loadSettings: async () => {
    const settings = await api.getSettings();
    set({ settings });
  },

  saveSettings: async (s) => {
    const settings = await api.saveSettings(s);
    set({ settings });
  },
}));

function metaOf(n: Novel): NovelMeta {
  return {
    id: n.id,
    title: n.title,
    description: n.description,
    genre: n.genre,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}
