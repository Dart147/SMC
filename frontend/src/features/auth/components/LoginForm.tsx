// auth/components/LoginForm.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // 新增本機 loading 狀態

  const navigate = useNavigate();
  const { login } = useAuth(); // 從 Zustand store 取出 login 函式

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("請輸入帳號與密碼");
      return;
    }

    setIsLoading(true); // 開始載入動畫

    try {
      // 🌟 等待 API 回應 (注意：傳入的是一個物件)
      await login({ username, password });
      navigate("/");
    } catch (err: any) {
      // 攔截 axios 拋出的錯誤，精準判斷狀態碼
      if (err.response?.status === 401) {
        setError("帳號或密碼錯誤，請重新輸入。");
      } else if (err.response?.status === 403) {
        // 🌟 新增 403 判斷：精準捕捉考試過期的狀態
        setError("您的考試時間已結束，該帳號已失效。");
      } else {
        // 其他真正的伺服器錯誤 (例如 500) 或網路斷線
        setError("伺服器連線異常，請稍後再試。");
      }
    } finally {
      setIsLoading(false); // 如果你有這行的話保留著
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
        面試系統登入
      </h2>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            面試帳號
          </label>
          <input
            type="text"
            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            placeholder="請輸入面試通知上的帳號"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            密碼
          </label>
          <input
            type="password"
            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            placeholder="請輸入密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* 錯誤訊息顯示區塊 */}
        {error && <p className="text-red-500 dark:text-red-400 text-sm italic">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full text-white font-medium py-2.5 rounded-lg shadow-sm transition-all ${
            isLoading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]"
          }`}
        >
          {isLoading ? "登入中..." : "進入工作區"}
        </button>
      </form>
    </div>
  );
};
