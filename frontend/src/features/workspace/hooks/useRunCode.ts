import { useState } from "react";
import { submitCode } from "../api";
import { useWorkspaceStore } from "../store";

export const useRunCode = () => {
  const [isRunning, setIsRunning] = useState(false);
  const { code, language, setOutput } = useWorkspaceStore();

  const runCode = async () => {
    setIsRunning(true);
    setOutput("Running...");
    try {
      const res = await submitCode({ code, language });
      setOutput(res.output);
    } catch (error) {
      setOutput("Error running code");
    } finally {
      setIsRunning(false);
    }
  };

  return { runCode, isRunning };
};
