import React, { useState } from "react";

const InterviewerPage = () => {
  const [info, setInfo] = useState({ acc: "", pw: "" });

  const generate = () => {
    // 生成隨機帳密邏輯
    const newAcc = "USER-" + Math.floor(Math.random() * 9000 + 1000);
    const newPw = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 存入 localStorage，讓 Login 頁面讀得到
    localStorage.setItem("temp_interview_acc", newAcc);
    localStorage.setItem("temp_interview_pw", newPw);

    setInfo({ acc: newAcc, pw: newPw });
    alert("帳密已生成！現在面試者可以去登入頁面輸入這組帳密了。");
  };

  return (
    <div className="p-10 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-blue-400">SMC 面試官管理控制台</h1>
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 max-w-md">
        <button
          onClick={generate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition w-full"
        >
          點擊生成面試者隨機帳密
        </button>

        {info.acc && (
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
