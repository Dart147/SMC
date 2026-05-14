import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 1. 從瀏覽器快取 (localStorage) 抓出面試官剛剛生成的帳密
    const savedAcc = localStorage.getItem("temp_interview_acc");
    const savedPw = localStorage.getItem("temp_interview_pw");

    // 2. 比對使用者輸入的資料與快取資料
    // 加入一個邏輯：如果快取是空的，就提醒先去生成
    if (!savedAcc || !savedPw) {
      setError("系統尚未生成帳密，請聯繫面試官。");
      return;
    }

    if (username === savedAcc && password === savedPw) {
      console.log("登入成功，正在跳轉...");
      navigate("/workspace"); // 登入後導向面試工作區
    } else {
      // 為了方便你除錯，我把正確的帳密印在 console
      //console.log("輸入帳密：", username, password);
      //console.log("正確帳密：", savedAcc, savedPw);
      setError("帳號或密碼錯誤，請重新輸入。");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">面試系統登入</h2>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">面試帳號</label>
          <input
            type="text"
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
            placeholder="請輸入面試通知上的帳號"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">密碼</label>
          <input
            type="password"
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
            placeholder="請輸入 6 位密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-red-400 text-sm italic">{error}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg shadow-lg transform active:scale-95 transition"
        >
          開始
        </button>
      </form>
    </div>
  );
};

export { LoginForm };
