// src/pages/Submissions/index.tsx
import { useState, useEffect } from "react";
import { SubmissionList } from "../../features/submissions/components/SubmissionList";
import { Submission } from "../../types/submission"; // ⚠️ 確認這裡的路徑是否正確

export function SubmissionsPage() {
  // 1. 定義狀態：存放所有提交紀錄、以及載入狀態
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 2. 當元件第一次載入時，去後端拉取資料
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        // ⚠️ 根據你的前端設定，這裡的 URL 可能是 'http://localhost:8081/api/submissions' 或單純 '/api/submissions'
        const response = await fetch("http://localhost:8081/api/submissions");

        if (!response.ok) {
          throw new Error("Failed to fetch submissions");
        }

        const data = await response.json();
        // 確保如果後端回傳 null 的時候，我們給它一個空陣列
        setAllSubmissions(data || []);
      } catch (error) {
        console.error("Error fetching submissions:", error);
        setAllSubmissions([]);
      } finally {
        setLoading(false); // 不管成功或失敗，最後都解除 loading 狀態
      }
    };

    fetchSubmissions();
  }, []); // 空陣列代表只在頁面載入時執行一次

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">All Submissions</h1>
        <p className="text-gray-500">View recent code executions and their results.</p>
      </div>

      {/* 3. 把我們剛拿到的狀態傳給子元件 */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-700">
        <SubmissionList submissions={allSubmissions} isLoading={loading} />
      </div>
    </div>
  );
}
