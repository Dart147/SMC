import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../services/api";
import { useWorkspaceStore } from "../store";

export const useRunCode = (problemId: string) => {
  const [isRunning, setIsRunning] = useState(false);
  const { code, language, setResult } = useWorkspaceStore();
  const navigate = useNavigate();

  const runCode = async () => {
    setIsRunning(true);
    setResult(null);
    try {
      // 2. 改用 apiClient.post，它會自動幫我們：
      // (1) 補上 /api 前綴
      // (2) 把 JSON 轉好
      // (3) 最重要：自動從 localStorage 拿出 Token 塞進 Header！
      const response = await apiClient.post("/submissions", {
        problemId,
        code,
        language,
      });

      // Axios 會把後端回傳的 JSON 放在 response.data 裡面
      const submission = response.data;
      setResult(submission);

      // 【關鍵修改】帶著熱騰騰的 submission.id 跳轉到結果頁！
      if (submission && submission.id) {
        navigate("/submissions", { state: { submissionId: submission.id } });
      }
    } catch (error: any) {
      // 🌟 3. 錯誤處理也可以順便升級，抓取後端真實的報錯訊息
      setResult({
        id: "",
        problemId,
        code,
        language,
        status: "Runtime Error",
        // 如果後端有回傳詳細錯誤就顯示，否則顯示預設訊息
        error: error.response?.data?.error || error.message || "連線失敗或伺服器發生異常",
        passedTestCases: 0,
        totalTestCases: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return { runCode, isRunning };
};
