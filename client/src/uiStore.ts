import { create } from 'zustand';

export type Tab = 'elements' | 'plot' | 'studio';

interface UIState {
  tab: Tab;
  selectedSceneId: string | null;
  selectedElementId: string | null;
  setTab: (t: Tab) => void;
  selectScene: (id: string | null) => void;
  selectElement: (id: string | null) => void;
}

export const useUI = create<UIState>((set) => ({
  tab: 'elements',
  selectedSceneId: null,
  selectedElementId: null,
  setTab: (tab) => set({ tab }),
  selectScene: (selectedSceneId) => set({ selectedSceneId }),
  selectElement: (selectedElementId) => set({ selectedElementId }),
}));
