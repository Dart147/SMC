import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProblems, fetchMyProblems } from "../../features/problems/api";
import { Problem } from "../../types/problem";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { apiClient } from "../../services/api";
import { Submission } from "../../types/submission";

export function ProblemList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCandidate = user?.role === "candidate";

  const [problems, setProblems] = useState<Problem[]>([]);
  const [acceptedProblemIds, setAcceptedProblemIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 考生只能看到被指派的題目；面試官/admin 看全部
        const problemsFetch = isCandidate ? fetchMyProblems() : fetchProblems();

        // 取得當前使用者的所有提交，找出已 Accepted 的題目
        const submissionsFetch = isCandidate
          ? apiClient
              .get<Submission[]>("/submissions")
              .then((res) => res.data)
              .catch(() => [] as Submission[])
          : Promise.resolve([] as Submission[]);

        const [loadedProblems, loadedSubmissions] = await Promise.all([
          problemsFetch,
          submissionsFetch,
        ]);

        setProblems(loadedProblems);

        // 建立「已 Accepted」的題目 ID Set，方便 O(1) 查詢
        const accepted = new Set<string>(
          loadedSubmissions.filter((s) => s.status === "Accepted").map((s) => String(s.problemId)),
        );
        setAcceptedProblemIds(accepted);
      } catch {
        setError("無法載入題目清單，請確認後端是否正常運行。");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isCandidate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-500">
        載入中...
      </div>
    );
  }

  if (error) {
    return <div className="flex items-center justify-center h-40 text-red-400">{error}</div>;
  }

  if (problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500 gap-2">
        <span className="text-4xl">📭</span>
        <p>{isCandidate ? "目前沒有被指派的題目。" : "題庫目前沒有題目。"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        {isCandidate ? "我的題目" : "所有題目"}
      </h1>

      <div className="flex flex-col gap-3">
        {problems.map((problem) => {
          const problemId = String(problem.id);
          const isAccepted = acceptedProblemIds.has(problemId);

          return (
            <div
              key={problemId}
              onClick={() => navigate(`/workspace/${problemId}`)}
              className={`
                relative flex items-center justify-between
                px-5 py-4 rounded-xl border cursor-pointer
                transition-all duration-150
                bg-white dark:bg-gray-800
                hover:border-blue-500 dark:hover:border-blue-400
                hover:shadow-md
                ${
                  isAccepted
                    ? "border-green-400 dark:border-green-500"
                    : "border-gray-200 dark:border-gray-700"
                }
              `}
            >
              {/* 左側：標題 + 完成標籤 */}
              <div className="flex items-center gap-3 min-w-0">
                {/* 完成圓點指示器 */}
                <span
                  className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${
                    isAccepted ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />

                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                    {problem.title}
                  </h3>
                </div>
              </div>

              {/* 右側：徽章區 */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                {/* 完成徽章 */}
                {isAccepted && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20">
                    ✓ 已完成
                  </span>
                )}

                {/* 難度：只有面試官/admin 能看到 */}
                {!isCandidate && problem.difficulty && (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      problem.difficulty === "Easy"
                        ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
                        : problem.difficulty === "Medium"
                          ? "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20"
                          : "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                    }`}
                  >
                    {problem.difficulty}
                  </span>
                )}

                {/* 箭頭 */}
                <span className="text-gray-400 dark:text-gray-500 text-sm">›</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部統計（考生專用） */}
      {isCandidate && (
        <p className="mt-6 text-sm text-center text-gray-400 dark:text-gray-500">
          已完成 {acceptedProblemIds.size} / {problems.length} 題
        </p>
      )}
    </div>
  );
}
