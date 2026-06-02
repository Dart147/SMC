import { create } from "zustand";
import { Submission } from "../../types/submission";
import { fetchSubmission } from "./api";

interface SubmissionsState {
  currentSubmission: Submission | null;
  isLoading: boolean;
  pollSubmission: (id: string) => Promise<void>;
  clearCurrent: () => void;
}

export const useSubmissionsStore = create<SubmissionsState>((set, _get) => ({
  currentSubmission: null,
  isLoading: false,

  pollSubmission: async (id: string) => {
    set({ isLoading: true });

    const poll = async () => {
      try {
        const data = await fetchSubmission(id);
        set({ currentSubmission: data });

        // 如果還在 Pending，1.5 秒後再問一次
        if (data.status === "Pending") {
          setTimeout(poll, 1500);
        } else {
          // 評測結束！
          set({ isLoading: false });
        }
      } catch (error) {
        console.error("Failed to fetch submission:", error);
        set({ isLoading: false });
      }
    };

    await poll();
  },

  clearCurrent: () => set({ currentSubmission: null }),
}));
