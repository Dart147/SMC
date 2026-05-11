import { create } from "zustand";

interface GlobalState {
  theme: "light" | "dark";
  user: any | null;
  setTheme: (theme: "light" | "dark") => void;
  setUser: (user: any | null) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  theme: "light",
  user: null,
  setTheme: (theme) => set({ theme }),
  setUser: (user) => set({ user }),
}));
