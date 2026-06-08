import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("請輸入帳號與密碼");
      return;
    }

    setIsLoading(true);

    try {
      await login({ username, password });
      navigate("/");
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("帳號或密碼錯誤，請重新輸入。");
      } else if (err.response?.status === 403) {
        setError("您的考試時間已結束，該帳號已失效。");
      } else {
        setError("伺服器連線異常，請稍後再試。");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xl shadow-gray-200/60 dark:shadow-black/40">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-50 mb-6 text-center tracking-tight">
        面試系統登入
      </h2>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
            帳號
          </label>
          <input
            type="text"
            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            placeholder="請輸入面試通知上的帳號"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
            密碼
          </label>
          <input
            type="password"
            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            placeholder="請輸入密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-lg px-4 py-2.5">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full font-semibold py-3 rounded-lg transition-all duration-200 ${
            isLoading
              ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-500 text-white active:scale-[0.98] shadow-lg shadow-indigo-900/20"
          }`}
        >
          {isLoading ? "登入中..." : "進入工作區"}
        </button>
      </form>
    </div>
  );
};
