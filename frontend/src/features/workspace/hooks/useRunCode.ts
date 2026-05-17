import { useState } from "react";
import { useNavigate } from "react-router-dom"; // 1. 引入 useNavigate
import { submitCode } from "../api";
import { useWorkspaceStore } from "../store";

export const useRunCode = (problemId: string) => {
  const [isRunning, setIsRunning] = useState(false);
  const { code, language, setResult } = useWorkspaceStore();
  const navigate = useNavigate(); // 2. 宣告 navigate

  const runCode = async () => {
    setIsRunning(true);
    setResult(null);
    try {
      const submission = await submitCode({ problemId, code, language });
      setResult(submission);
      
      // 3. 送出成功且拿到結果後，跳轉到 submissions 頁面
      // (選擇性) 可以透過 state 傳遞問題 ID，讓下一頁知道剛才是從哪題送出的
      navigate("/submissions", { state: { problemId } }); 
      
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
      // 注意：如果是網路錯誤 (catch)，我們就不跳轉，讓使用者留在原畫面看 Console 錯誤
    } finally {
      setIsRunning(false);
    }
  };

  return { runCode, isRunning };
};