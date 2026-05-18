import { useEffect, useState } from "react";
import { Submission } from "../../../types/submission";

const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: "sub-1a2b3c",
    problemId: "two-sum",
    code: "def twoSum(nums, target):\n    return []",
    language: "python",
    status: "Accepted",
    passedTestCases: 15,
    totalTestCases: 15,
  },
  {
    id: "sub-4d5e6f",
    problemId: "valid-parentheses",
    code: "class Solution {\npublic:\n    bool isValid(string s) {\n        return false;\n    }\n};",
    language: "cpp",
    status: "Wrong Answer",
    output: "false",
    expectedOutput: "true",
    passedTestCases: 3,
    totalTestCases: 10,
  },
  {
    id: "sub-7g8h9i",
    problemId: "merge-intervals",
    code: "function merge(intervals) {\n  return intervals;\n}",
    language: "javascript",
    status: "Runtime Error",
    error: "TypeError: Cannot read properties of undefined",
    passedTestCases: 0,
    totalTestCases: 8,
  },
];

// 🎨 建立一個小幫手函數，用來決定狀態標籤的顏色
const getStatusBadge = (status: string) => {
  if (status === "Accepted") {
    return "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20";
  }
  if (status.includes("Wrong") || status.includes("Error")) {
    return "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
  }
  return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20";
};

export function SubmissionList() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    setSubmissions(MOCK_SUBMISSIONS);
  }, []);

  return (
    // 1. 外層加上圓角卡片與陰影
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          {/* 2. 表頭加上微弱的背景色，文字改為全大寫與加粗，增加專業感 */}
          <thead className="bg-gray-50 uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400 text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">Submission ID</th>
              <th className="px-6 py-4">Problem</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Test Cases</th>
              <th className="px-6 py-4">Language</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {submissions.map((sub) => (
              // 3. 每一列加上 Hover 變色特效，讓使用者知道可以點擊
              <tr
                key={sub.id}
                className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 group cursor-pointer"
              >
                <td className="px-6 py-4 font-mono text-gray-500 dark:text-gray-400">
                  {sub.id.substring(0, 8)}
                </td>
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {sub.problemId}
                </td>
                <td className="px-6 py-4">
                  {/* 4. 將狀態變成帶有邊框的精緻 Pill (膠囊) 標籤 */}
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(sub.status)}`}
                  >
                    {sub.status === "Accepted" && (
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500"></span>
                    )}
                    {sub.status.includes("Error") || sub.status.includes("Wrong") ? (
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-500"></span>
                    ) : null}
                    {sub.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${sub.passedTestCases === sub.totalTestCases ? "text-green-600 dark:text-green-400" : "text-gray-700 dark:text-gray-300"}`}
                    >
                      {sub.passedTestCases}{" "}
                      <span className="text-gray-400 font-normal">/ {sub.totalTestCases}</span>
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-400 capitalize">
                  {sub.language}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
