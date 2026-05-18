// src/pages/Submissions/index.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSubmissionsStore } from "./store"; // 請確認路徑是否正確
import { SubmissionList } from "./components/SubmissionList";
import { Submission } from "../../types/submission";
import { apiClient } from "../../services/apiClient";

export const fetchSubmission = async (id: string): Promise<Submission> => {
  const response = await apiClient.get<Submission>(`/api/submissions/${id}`);
  return response.data;
};

export default function SubmissionsPage() {
  const location = useLocation();
  const { currentSubmission, isLoading, pollSubmission } = useSubmissionsStore();

  // 從 navigate 的 state 中解構出 submissionId
  const submissionId = location.state?.submissionId;

  useEffect(() => {
    if (submissionId) {
      // 一進入畫面，立刻開始輪詢這筆提交！
      pollSubmission(submissionId);
    }
  }, [submissionId, pollSubmission]);

  return (
    <div className="container max-w-5xl p-8 mx-auto">
      <h1 className="mb-8 text-3xl font-bold dark:text-white">Submission Result</h1>

      {!submissionId ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            No recent submission found. Go to a problem and submit some code!
          </p>
        </div>
      ) : (
        <SubmissionList
          submissions={currentSubmission ? [currentSubmission] : []}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
