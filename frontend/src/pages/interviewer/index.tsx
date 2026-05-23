import { useState } from "react";
// 引入你的 API 呼叫函式 (我們稍後在 api.ts 裡面新增)
import { createCandidate } from "../../services/api";

const InterviewerPage = () => {
  const [info, setInfo] = useState({ acc: "", pw: "" });
  const [isLoading, setIsLoading] = useState(false);

  const generate = async () => {
    // 1. 生成隨機帳密 (維持你原本很棒的 UX 設計)
    const newAcc = "USER-" + Math.floor(Math.random() * 9000 + 1000);
    const newPw = Math.random().toString(36).substring(2, 8).toUpperCase();

    setIsLoading(true);
    try {
      // 2. 呼叫後端 API，把資料寫進真實的 PostgreSQL 資料庫
      await createCandidate({ username: newAcc, password: newPw });

      // 3. 寫入成功後，才顯示給面試官看
      setInfo({ acc: newAcc, pw: newPw });
      alert("帳號已成功寫入資料庫！現在面試者可以使用這組帳密登入了。");
    } catch (error) {
      console.error(error);
      alert("創建失敗，請確認您是否有 Admin 權限，或檢查伺服器狀態。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-10 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-blue-400">SMC 面試官管理控制台</h1>
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 max-w-md">
        <button
          onClick={generate}
          disabled={isLoading}
          className={`font-bold py-2 px-4 rounded transition w-full ${
            isLoading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isLoading ? "⏳ 建立中..." : "點擊生成面試者隨機帳密"}
        </button>

        {info.acc && !isLoading && (
          <div className="mt-6 p-4 bg-gray-900 rounded border border-green-500">
            <p className="text-gray-400 text-sm">請將以下資訊提供給面試者：</p>
            <div className="mt-2">
              <p>
                帳號：<span className="text-yellow-400 font-mono text-lg">{info.acc}</span>
              </p>
              <p>
                密碼：<span className="text-yellow-400 font-mono text-lg">{info.pw}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewerPage;
