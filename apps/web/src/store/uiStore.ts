'use client';

import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  activeNav: string;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveNav: (nav: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeNav: '/dashboard',

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setActiveNav: (nav) => set({ activeNav: nav }),
}));