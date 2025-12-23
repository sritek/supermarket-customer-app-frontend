import { create } from "zustand";

interface UIState {
  cartUpdated: number; // Timestamp to trigger updates
  triggerCartUpdate: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  cartUpdated: Date.now(),
  triggerCartUpdate: () => set({ cartUpdated: Date.now() }),
}));

