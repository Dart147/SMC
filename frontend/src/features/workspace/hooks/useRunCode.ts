import { useState } from "react";
import { submitCode } from "../api";
import { useWorkspaceStore } from "../store";

export const useRunCode = (problemId: string) => {
  const [isRunning, setIsRunning] = useState(false);
  const { code, language, setResult } = useWorkspaceStore();

  const runCode = async () => {
    setIsRunning(true);
    setResult(null);
    try {
      const submission = await submitCode({ problemId, code, language });
      setResult(submission);
    } catch {
      setResult({
        id: "",
        problemId,
        code,
        language,
        status: "Runtime Error",
        error: "Could not reach the backend. Is it running on port 8081?",
        passedTestCases: 0,
        totalTestCases: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return { runCode, isRunning };
};
