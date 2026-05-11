import React, { useEffect, useState } from "react";
import { fetchProblems } from "../../features/problems/api";

export const ProblemList: React.FC = () => {
  const [problems, setProblems] = useState<any[]>([]);

  useEffect(() => {
    fetchProblems().then((data: any) => setProblems(data));
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Problem List</h1>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {problems.map((p) => (
            <li
              key={p.id}
              className="p-4 hover:bg-gray-50 flex justify-between items-center transition-colors"
            >
              <span className="font-medium text-lg">
                {p.id}. {p.title}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  p.difficulty === "Easy"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {p.difficulty}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
