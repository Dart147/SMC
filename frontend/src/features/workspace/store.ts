import { create } from "zustand";
import { Language } from "./constants";
import { Submission } from "../../types/submission";

interface WorkspaceState {
  code: string;
  language: Language;
  result: Submission | null;
  setCode: (code: string) => void;
  setLanguage: (lang: Language) => void;
  setResult: (result: Submission | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  code: "// Write your code here\n",
  language: "javascript",
  result: null,
  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
  setResult: (result) => set({ result }),
}));
