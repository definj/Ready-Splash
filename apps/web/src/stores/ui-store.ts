import { create } from "zustand";

type UIState = {
  privacyMode: boolean;
  sidebarOpen: boolean;
  togglePrivacy: () => void;
  setSidebarOpen: (open: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  privacyMode: false,
  sidebarOpen: true,
  togglePrivacy: () => set((s) => ({ privacyMode: !s.privacyMode })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
