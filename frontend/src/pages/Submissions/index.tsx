// src/pages/Submissions/index.tsx
import { useState, useEffect } from "react";
import { SubmissionList } from "../../features/submissions/components/SubmissionList";
import { Submission } from "../../types/submission";
import { apiClient } from "../../services/api";

export function SubmissionsPage() {
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/submissions");

        // axios 自動將 JSON 解析放在 response.data
        setAllSubmissions(response.data || []);
      } catch (error) {
        console.error("Error fetching submissions:", error);
        setAllSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">All Submissions</h1>
        <p className="text-gray-500">View recent code executions and results.</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-700">
        <SubmissionList submissions={allSubmissions} isLoading={loading} />
      </div>
    </div>
  );
}