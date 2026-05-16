// src/pages/Submissions/index.tsx
import { SubmissionList } from "../../features/submissions/components/SubmissionList";

export function SubmissionsPage() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">All Submissions</h1>
        <p className="text-gray-500">View recent code executions and their results.</p>
      </div>

      {/* 載入 Feature 的列表元件 */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-700">
        <SubmissionList />
      </div>
    </div>
  );
}
