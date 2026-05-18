import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitCode } from "../api";
import { useWorkspaceStore } from "../store";

export const useRunCode = (problemId: string) => {
  const [isRunning, setIsRunning] = useState(false);
  const { code, language, setResult } = useWorkspaceStore();
  const navigate = useNavigate();

  const runCode = async () => {
    setIsRunning(true);
    setResult(null);
    try {
      // 1. 呼叫後端 POST /api/submissions
      const submission = await submitCode({ problemId, code, language });
      setResult(submission);

      // 2. 【關鍵修改】帶著熱騰騰的 submission.id 跳轉到結果頁！
      if (submission && submission.id) {
        navigate("/submissions", { state: { submissionId: submission.id } });
      }
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
