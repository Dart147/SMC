import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProblems } from "../../features/problems/api";
import { Problem } from "../../types/problem";

export function ProblemList() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProblems()
      .then(setProblems)
      .catch(() => setError("Failed to load problems. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: "40px", color: "#d4d4d4" }}>Loading...</div>;
  if (error) return <div style={{ padding: "40px", color: "#f87171" }}>{error}</div>;

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", color: "#d4d4d4" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "24px", color: "#fff" }}>Problem List</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {problems.map((problem) => (
          <div
            key={problem.id}
            onClick={() => navigate(`/workspace/${problem.id}`)}
            style={{
              padding: "16px",
              background: "#252526",
              border: "1px solid #333",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#007acc")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#333")}
          >
            <div>
              <h3 style={{ fontSize: "18px", margin: "0 0 8px 0", color: "#fff" }}>
                {problem.title}
              </h3>
            </div>

            <span
              style={{
                fontWeight: "bold",
                color:
                  problem.difficulty === "Easy"
                    ? "#4ade80"
                    : problem.difficulty === "Medium"
                      ? "#fbbf24"
                      : "#f87171",
              }}
            >
              {problem.difficulty}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
