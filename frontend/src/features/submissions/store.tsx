import { create } from "zustand";
import { Submission } from "../../types/submission";
import { apiClient } from "../../services/api";

const TERMINAL_STATUSES = new Set([
  "Accepted",
  "Wrong Answer",
  "Time Limit Exceeded",
  "Memory Limit Exceeded",
  "Runtime Error",
  "Compile Error",
]);

interface SubmissionsState {
  history: Submission[];
  isLoading: boolean;
  fetchHistory: () => Promise<void>;
  pollUntilTerminal: (id: string, onDone: () => void) => void;
}

export const useSubmissionsStore = create<SubmissionsState>((set) => ({
  history: [],
  isLoading: false,

  fetchHistory: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get<Submission[]>("/submissions");
      set({ history: res.data ?? [] });
    } catch {
      set({ history: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  // Polls a single pending submission until it reaches a terminal status, then
  // calls onDone so the caller can re-fetch history.
  pollUntilTerminal: (id: string, onDone: () => void) => {
    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get<Submission>(`/submissions/${id}`);
        const sub = res.data;
        if (TERMINAL_STATUSES.has(sub.status)) {
          clearInterval(interval);
          onDone();
        }
      } catch {
        clearInterval(interval);
      }
    }, 1500);
  },
}));
