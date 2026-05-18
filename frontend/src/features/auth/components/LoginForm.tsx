import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const savedAcc = localStorage.getItem("temp_interview_acc");
    const savedPw = localStorage.getItem("temp_interview_pw");

    if (!savedAcc || !savedPw) {
      setError("系統尚未生成帳密，請聯繫面試官。");
      return;
    }

    if (username === savedAcc && password === savedPw) {
      navigate("/problems");
    } else {
      setError("帳號或密碼錯誤，請重新輸入。");
    }
  };

  return (
    // 統一的圓角卡片外觀
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
            placeholder="請輸入 6 位密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-red-500 dark:text-red-400 text-sm italic">{error}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg shadow-sm transform active:scale-[0.98] transition-all"
        >
          進入工作區
        </button>
      </form>
    </div>
  );
};
