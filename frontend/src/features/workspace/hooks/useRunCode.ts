import { useState } from "react";
import { submitCode } from "../api";
import { useWorkspaceStore } from "../store";

export const useRunCode = (problemId: string) => {
  const [isRunning, setIsRunning] = useState(false);
  const { code, language, setOutput } = useWorkspaceStore();

  const runCode = async () => {
    setIsRunning(true);
    setOutput("Submitting...");
    try {
      const res = await submitCode({ problemId, code, language });
      setOutput(res.output);
    } catch {
      setOutput("Error: Could not reach the backend. Is it running on port 8081?");
    } finally {
      setIsRunning(false);
    }
  };

  return { runCode, isRunning };
};
