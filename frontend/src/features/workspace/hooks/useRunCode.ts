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
      // 2. 呼叫 submitCode
      // 這裡會觸發 POST，並且在內部每 1.5 秒自動 GET 輪詢，直到沙盒評測結束才會往下走！
      const submission = await submitCode({
        problemId,
        code,
        language,
      });

      setResult(submission);

      // 帶著熱騰騰的 submission.id 跳轉到結果頁
      if (submission && submission.id) {
        navigate("/submissions", { state: { submissionId: submission.id } });
      }
    } catch (error: any) {
      setResult({
        id: "",
        problemId,
        code,
        language,
        status: "Runtime Error",
        error: error.response?.data?.error || error.message || "連線失敗或伺服器發生異常",
        passedTestCases: 0,
        totalTestCases: 0,
      });
    } finally {
      setIsRunning(false); // 評測結束，關閉載入狀態
    }
  };

  return { runCode, isRunning };
};