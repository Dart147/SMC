import { create } from "zustand";

interface WorkspaceState {
  code: string;
  language: string;
  output: string;
  setCode: (code: string) => void;
  setLanguage: (lang: string) => void;
  setOutput: (output: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  code: "// Write your code here\n",
  language: "javascript",
  output: "",
  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
  setOutput: (output) => set({ output }),
}));
