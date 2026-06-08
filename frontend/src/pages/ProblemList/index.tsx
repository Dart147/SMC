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
        const problemsFetch = isCandidate ? fetchMyProblems() : fetchProblems();
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
      <div className="flex items-center justify-center h-40 text-gray-400 dark:text-slate-500 text-sm">
        <svg className="w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        載入中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-40 text-red-600 dark:text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-slate-500 gap-2">
        <svg
          className="w-10 h-10 text-gray-300 dark:text-slate-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-sm">{isCandidate ? "目前沒有被指派的題目。" : "題庫目前沒有題目。"}</p>
      </div>
    );
  }

  const difficultyConfig = {
    Easy: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50",
    Medium:
      "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
    Hard: "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50",
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-50 tracking-tight">
          {isCandidate ? "我的題目" : "所有題目"}
        </h1>
        {isCandidate && (
          <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">
            {acceptedProblemIds.size} / {problems.length} 已完成
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {problems.map((problem, index) => {
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
                bg-white dark:bg-slate-900
                hover:bg-gray-50 dark:hover:bg-slate-800/80 hover:border-gray-300 dark:hover:border-slate-600
                ${isAccepted ? "border-emerald-300 dark:border-emerald-800/50" : "border-gray-200 dark:border-slate-800"}
              `}
            >
              {/* Left: index + title */}
              <div className="flex items-center gap-4 min-w-0">
                <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 text-xs font-mono font-bold">
                  {index + 1}
                </span>

                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100 truncate">
                    {problem.title}
                  </h3>
                </div>
              </div>

              {/* Right: badges */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                {isAccepted && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    已完成
                  </span>
                )}

                {!isCandidate && problem.difficulty && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${difficultyConfig[problem.difficulty as keyof typeof difficultyConfig] ?? "text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700"}`}
                  >
                    {problem.difficulty}
                  </span>
                )}

                <svg
                  className="w-4 h-4 text-gray-300 dark:text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
