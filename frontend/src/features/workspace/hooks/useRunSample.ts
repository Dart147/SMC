import { useState } from "react";
import { apiClient } from "../../../services/api";
import { useWorkspaceStore } from "../store";

export const useRunSample = (problemId: string) => {
  const [isRunSample, setIsRunSample] = useState(false);
  const { code, language, setResult } = useWorkspaceStore();

  const runSample = async () => {
    setIsRunSample(true);
    setResult(null);
    try {
      const res = await apiClient.post("/run", { problemId, code, language });
      const data = res.data;
      setResult({
        id: "",
        problemId,
        code,
        language,
        status: data.status,
        output: data.output,
        expectedOutput: data.expectedOutput,
        error: data.error,
        passedTestCases: data.status === "Accepted" ? 1 : 0,
        totalTestCases: 1,
      });
    } catch (error: any) {
      setResult({
        id: "",
        problemId,
        code,
        language,
        status: "Runtime Error",
        error: error.response?.data?.error || error.message || "連線失敗",
        passedTestCases: 0,
        totalTestCases: 1,
      });
    } finally {
      setIsRunSample(false);
    }
  };

  return { runSample, isRunSample };
};
