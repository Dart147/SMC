import React, { useRef, useState } from "react";
import { createCandidate, apiClient } from "../../services/api";
import {
  assignProblem,
  unassignProblem,
  fetchCandidateAssignments,
  deleteProblem,
  updateProblem,
  fetchAdminProblemById,
} from "../../features/problems/api";
import { useNavigate } from "react-router-dom";
import { Select } from "../../components/Common/Select";

interface TestCase {
  input: string;
  expected_output: string;
}

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  description: string;
  timeLimitMs?: number;
  testCases?: TestCase[];
  test_cases?: TestCase[];
}

interface Candidate {
  id: string;
  username: string;
}

interface FormTestCase {
  uid: number;
  input: string;
  output: string;
  isHidden?: boolean;
}

interface ProblemFormFieldsProps {
  readonly titleId: string;
  readonly titleValue: string;
  readonly onTitleChange: (v: string) => void;
  readonly difficultyValue: string;
  readonly onDifficultyChange: (v: string) => void;
  readonly descriptionId: string;
  readonly descriptionValue: string;
  readonly onDescriptionChange: (v: string) => void;
  readonly timeLimitMs: number;
  readonly onTimeLimitMsChange: (v: number) => void;
  readonly testCases: FormTestCase[];
  readonly onTestCaseChange: (index: number, field: "input" | "output", value: string) => void;
  readonly onAddTestCase: () => void;
  readonly onRemoveTestCase?: (index: number) => void;
  readonly onToggleHidden?: (index: number) => void;
}

const difficultyStyle: Record<string, string> = {
  Easy: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
  Medium:
    "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
  Hard: "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40",
};

const DIFFICULTY_OPTIONS = [
  {
    value: "Easy",
    label: "Easy",
    meta: (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40">
        E
      </span>
    ),
  },
  {
    value: "Medium",
    label: "Medium",
    meta: (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40">
        M
      </span>
    ),
  },
  {
    value: "Hard",
    label: "Hard",
    meta: (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40">
        H
      </span>
    ),
  },
];

function ProblemFormFields({
  titleId,
  titleValue,
  onTitleChange,
  difficultyValue,
  onDifficultyChange,
  descriptionId,
  descriptionValue,
  onDescriptionChange,
  timeLimitMs,
  onTimeLimitMsChange,
  testCases,
  onTestCaseChange,
  onAddTestCase,
  onRemoveTestCase,
  onToggleHidden,
}: ProblemFormFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label
            htmlFor={titleId}
            className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wider"
          >
            Title
          </label>
          <input
            id={titleId}
            type="text"
            value={titleValue}
            onChange={(e) => onTitleChange(e.target.value)}
            required
            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            placeholder="Problem title"
          />
        </div>
        <div>
          <span className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
            Difficulty
          </span>
          <Select
            value={difficultyValue}
            onChange={onDifficultyChange}
            options={DIFFICULTY_OPTIONS}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={descriptionId}
          className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wider"
        >
          Description (Markdown)
        </label>
        <textarea
          id={descriptionId}
          value={descriptionValue}
          onChange={(e) => onDescriptionChange(e.target.value)}
          required
          className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 h-48 text-gray-900 dark:text-slate-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-gray-400 dark:placeholder-slate-500"
          placeholder="Describe the problem in Markdown..."
        />
      </div>

      <div>
        <label
          htmlFor="time-limit-ms"
          className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wider"
        >
          Time Limit (ms)
        </label>
        <input
          id="time-limit-ms"
          type="number"
          min={100}
          value={timeLimitMs}
          onChange={(e) => onTimeLimitMsChange(Number(e.target.value))}
          className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
        />
      </div>

      <div className="border-t border-gray-200 dark:border-slate-800 pt-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
            Test Cases
          </span>
          <button
            type="button"
            onClick={onAddTestCase}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/40 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            + Add Test Case
          </button>
        </div>
        <div className="space-y-2">
          {testCases.map((tc, index) => (
            <div
              key={`tc-${tc.uid}`}
              className={`bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border transition-colors ${tc.isHidden ? "border-amber-200 dark:border-amber-800/40" : "border-gray-200 dark:border-slate-700/50"}`}
            >
              <div className="grid grid-cols-2 gap-3 mb-2">
                <input
                  placeholder="Input"
                  value={tc.input}
                  onChange={(e) => onTestCaseChange(index, "input", e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-gray-700 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
                <input
                  placeholder="Expected Output"
                  value={tc.output}
                  onChange={(e) => onTestCaseChange(index, "output", e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-gray-700 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              {(onToggleHidden || onRemoveTestCase) && (
                <div className="flex items-center justify-between">
                  {onToggleHidden ? (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={tc.isHidden ?? false}
                        onChange={() => onToggleHidden(index)}
                        className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
                      />
                      <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        Hidden (not shown to candidate)
                      </span>
                    </label>
                  ) : (
                    <span />
                  )}
                  {onRemoveTestCase && testCases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveTestCase(index)}
                      className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const InterviewerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"create" | "list" | "assign">("create");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const nextUid = useRef(0);
  const uid = () => (nextUid.current += 1);

  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [description, setDescription] = useState("");
  const [timeLimitMs, setTimeLimitMs] = useState<number>(5000);
  const [testCases, setTestCases] = useState<FormTestCase[]>([
    { input: "", output: "", uid: uid() },
  ]);
  const [candidateCreds, setCandidateCreds] = useState<{ acc: string; pw: string } | null>(null);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [assignedProblemIds, setAssignedProblemIds] = useState<Set<string>>(new Set());
  const [assignLoading, setAssignLoading] = useState(false);
  const [allProblemsForAssign, setAllProblemsForAssign] = useState<Problem[]>([]);

  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDifficulty, setEditDifficulty] = useState("Medium");
  const [editDescription, setEditDescription] = useState("");
  const [editTimeLimitMs, setEditTimeLimitMs] = useState<number>(5000);
  const [editTestCases, setEditTestCases] = useState<FormTestCase[]>([]);

  const generateCredentials = async () => {
    const randomVals = new Uint32Array(1);
    globalThis.crypto.getRandomValues(randomVals);
    const newAcc = "USER-" + (1000 + (randomVals[0] % 9000));
    const newPw = globalThis.crypto.randomUUID().substring(0, 6).toUpperCase();
    setIsLoading(true);
    try {
      await createCandidate({ username: newAcc, password: newPw });
      setCandidateCreds({ acc: newAcc, pw: newPw });
      alert("Account created successfully.");
    } catch {
      alert("Failed to create account. Check server status.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProblems = async () => {
    try {
      const response = await apiClient.get("/problems");
      setProblems(response.data || []);
      setActiveTab("list");
    } catch {
      alert("Failed to fetch problems. Check permissions or server.");
    }
  };

  const openAssignTab = async () => {
    setActiveTab("assign");
    setAssignLoading(true);
    try {
      const [candidatesRes, problemsRes] = await Promise.all([
        apiClient.get<Candidate[]>("/interviewer/candidates"),
        apiClient.get<Problem[]>("/problems"),
      ]);
      const cands: Candidate[] = (candidatesRes.data as any[]).map((c: any) => ({
        id: c.id,
        username: c.username,
      }));
      setCandidates(cands);
      setAllProblemsForAssign(problemsRes.data || []);
      if (selectedCandidateId) {
        const ids = await fetchCandidateAssignments(selectedCandidateId);
        setAssignedProblemIds(new Set(ids.map(String)));
      }
    } catch {
      alert("Failed to load candidates or problems.");
    } finally {
      setAssignLoading(false);
    }
  };

  const selectCandidate = async (candidateId: string) => {
    setSelectedCandidateId(candidateId || null);
    if (!candidateId) {
      setAssignedProblemIds(new Set());
      return;
    }
    setAssignLoading(true);
    try {
      const ids = await fetchCandidateAssignments(candidateId);
      setAssignedProblemIds(new Set(ids.map(String)));
    } catch {
      alert("Failed to load assignment list.");
    } finally {
      setAssignLoading(false);
    }
  };

  const toggleAssignment = async (problemId: string) => {
    if (!selectedCandidateId) return;
    const pidStr = String(problemId);
    const isAssigned = assignedProblemIds.has(pidStr);
    try {
      if (isAssigned) {
        await unassignProblem(selectedCandidateId, pidStr);
        setAssignedProblemIds((prev) => {
          const next = new Set(prev);
          next.delete(pidStr);
          return next;
        });
      } else {
        await assignProblem(selectedCandidateId, pidStr);
        setAssignedProblemIds((prev) => new Set([...prev, pidStr]));
      }
    } catch {
      alert("Operation failed. Check server status.");
    }
  };

  const handleSubmitProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    const problemData = {
      title,
      difficulty,
      description,
      timeLimitMs,
      testCases: testCases.map((tc) => ({
        input: tc.input,
        expected_output: tc.output,
      })),
    };

    try {
      await apiClient.post("/problems", problemData);
      alert("Problem saved successfully.");
      setTitle("");
      setDescription("");
      setTimeLimitMs(5000);
      setTestCases([{ input: "", output: "", uid: uid() }]);
      fetchProblems();
    } catch {
      alert("Save failed. Check server or permissions.");
    }
  };

  const handleDeleteProblem = async (problemId: string, problemTitle: string) => {
    if (
      !globalThis.confirm(
        `Delete "${problemTitle}"? This will also remove all submissions and assignments for this problem.`,
      )
    )
      return;
    try {
      await deleteProblem(String(problemId));
      setProblems((prev) => prev.filter((p) => String(p.id) !== String(problemId)));
      setAllProblemsForAssign((prev) => prev.filter((p) => String(p.id) !== String(problemId)));
    } catch {
      alert("Failed to delete problem. Check permissions or server.");
    }
  };

  const openEditProblem = async (p: Problem) => {
    try {
      const full = await fetchAdminProblemById(String(p.id));
      setEditTitle(full.title);
      setEditDifficulty(full.difficulty);
      setEditDescription(full.description);
      setEditTimeLimitMs(full.timeLimitMs ?? 5000);
      setEditTestCases(
        (full.testCases || []).map((tc: any) => ({
          input: tc.input || "",
          output: tc.expected_output || "",
          isHidden: tc.isHidden ?? false,
          uid: uid(),
        })),
      );
      setEditingProblem(p);
    } catch {
      alert("Failed to load problem details. Check server or permissions.");
    }
  };

  const handleEditTestCaseChange = (index: number, field: "input" | "output", value: string) => {
    const next = [...editTestCases];
    next[index][field] = value;
    setEditTestCases(next);
  };

  const toggleEditTestCaseHidden = (index: number) => {
    setEditTestCases((prev) =>
      prev.map((tc, i) => (i === index ? { ...tc, isHidden: !tc.isHidden } : tc)),
    );
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProblem) return;
    try {
      await updateProblem(String(editingProblem.id), {
        title: editTitle,
        difficulty: editDifficulty,
        description: editDescription,
        timeLimitMs: editTimeLimitMs,
        testCases: editTestCases.map((tc) => ({
          input: tc.input,
          expected_output: tc.output,
          isHidden: tc.isHidden,
        })),
      });
      const editedId = String(editingProblem.id);
      const patchProblem = (p: Problem): Problem =>
        String(p.id) === editedId
          ? {
              ...p,
              title: editTitle,
              difficulty: editDifficulty,
              description: editDescription,
              timeLimitMs: editTimeLimitMs,
              testCases: editTestCases.map((tc) => ({
                input: tc.input,
                expected_output: tc.output,
              })),
            }
          : p;
      setProblems((prev) => prev.map(patchProblem));
      setEditingProblem(null);
    } catch {
      alert("Failed to save changes. Check server or permissions.");
    }
  };

  const addTestCase = () => setTestCases([...testCases, { input: "", output: "", uid: uid() }]);
  const handleTestCaseChange = (index: number, field: "input" | "output", value: string) => {
    const next = [...testCases];
    next[index][field] = value;
    setTestCases(next);
  };

  const navItems = [
    {
      id: "create" as const,
      label: "New Problem",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      onClick: () => setActiveTab("create"),
    },
    {
      id: "list" as const,
      label: "Problem Bank",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
      onClick: fetchProblems,
    },
    {
      id: "assign" as const,
      label: "Assign Problems",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      onClick: openAssignTab,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-slate-200 p-4 sm:p-6 md:p-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-50 tracking-tight">
            SMC Dashboard
          </h1>
          <p className="text-gray-400 dark:text-slate-500 text-sm mt-1">
            Interviewer control panel
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
            {/* Monitor shortcut */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 dark:text-slate-500 mb-3">
                Monitor
              </p>
              <button
                onClick={() => navigate("/submissions")}
                className="w-full flex items-center gap-2 justify-center font-semibold py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-all shadow-lg shadow-indigo-900/20 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                View Submissions
              </button>
            </div>

            {/* Candidate generator */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 dark:text-slate-500 mb-3">
                Candidate
              </p>
              <button
                onClick={generateCredentials}
                disabled={isLoading}
                className={`w-full font-semibold py-2.5 px-4 rounded-lg text-sm transition-all cursor-pointer ${
                  isLoading
                    ? "bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed"
                    : "bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-100 border border-gray-200 dark:border-slate-700"
                }`}
              >
                {isLoading ? "Creating..." : "Generate Credentials"}
              </button>
              {candidateCreds && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-mono text-indigo-600 dark:text-indigo-300 space-y-1">
                  <div>
                    <span className="text-gray-400 dark:text-slate-500">Account:</span>{" "}
                    {candidateCreds.acc}
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-slate-500">Password:</span>{" "}
                    {candidateCreds.pw}
                  </div>
                </div>
              )}
            </div>

            {/* Nav items */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-2 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    activeTab === item.id
                      ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Assign tab */}
            {activeTab === "assign" && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-slate-50 mb-5">
                  Assign Problems
                </h2>

                <div className="mb-5">
                  <span className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                    Select Candidate
                  </span>
                  <Select
                    value={selectedCandidateId ?? ""}
                    onChange={selectCandidate}
                    placeholder="— Select a candidate —"
                    options={[...candidates.map((c) => ({ value: c.id, label: c.username }))]}
                  />
                </div>

                {selectedCandidateId ? (
                  assignLoading ? (
                    <div className="text-gray-400 dark:text-slate-500 text-sm text-center py-8">
                      Loading...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">
                        {assignedProblemIds.size} / {allProblemsForAssign.length} problems assigned
                      </p>
                      {allProblemsForAssign.map((p) => {
                        const pid = String(p.id);
                        const isAssigned = assignedProblemIds.has(pid);
                        return (
                          <div
                            key={`assign-${pid}`}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                              isAssigned
                                ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/40"
                                : "bg-gray-50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${isAssigned ? "bg-indigo-500 dark:bg-indigo-400" : "bg-gray-300 dark:bg-slate-600"}`}
                              />
                              <div>
                                <p className="text-gray-800 dark:text-slate-100 font-medium text-sm">
                                  {p.title}
                                </p>
                                <span
                                  className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${difficultyStyle[p.difficulty] ?? "text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700"}`}
                                >
                                  {p.difficulty}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleAssignment(pid)}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                isAssigned
                                  ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 hover:bg-red-100 dark:hover:bg-red-950/50"
                                  : "bg-indigo-600 text-white hover:bg-indigo-500"
                              }`}
                            >
                              {isAssigned ? "Unassign" : "Assign"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-300 dark:text-slate-600 gap-3">
                    <svg
                      className="w-10 h-10 text-gray-200 dark:text-slate-800"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <p className="text-sm">Select a candidate to manage assignments</p>
                  </div>
                )}
              </div>
            )}

            {/* Create problem tab */}
            {activeTab === "create" && (
              <form
                onSubmit={handleSubmitProblem}
                className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6 space-y-5"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-slate-50">
                    New Problem
                  </h2>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-6 rounded-lg text-sm transition-all shadow-lg shadow-indigo-900/20 cursor-pointer"
                  >
                    Save Problem
                  </button>
                </div>

                <ProblemFormFields
                  titleId="create-title"
                  titleValue={title}
                  onTitleChange={setTitle}
                  difficultyValue={difficulty}
                  onDifficultyChange={setDifficulty}
                  descriptionId="create-description"
                  descriptionValue={description}
                  onDescriptionChange={setDescription}
                  timeLimitMs={timeLimitMs}
                  onTimeLimitMsChange={setTimeLimitMs}
                  testCases={testCases}
                  onTestCaseChange={handleTestCaseChange}
                  onAddTestCase={addTestCase}
                />
              </form>
            )}

            {/* Problem list tab */}
            {activeTab === "list" && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-slate-50 mb-5">
                  Problem Bank
                </h2>
                <div className="space-y-2">
                  {problems.map((p) => (
                    <div
                      key={`p-list-${p.id}`}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/50 rounded-xl hover:border-gray-300 dark:hover:border-slate-600 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <div className="text-gray-800 dark:text-slate-100 font-semibold text-sm truncate">
                            {p.title}
                          </div>
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border mt-1 inline-block ${difficultyStyle[p.difficulty] ?? "text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700"}`}
                          >
                            {p.difficulty}
                          </span>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-all">
                        <button
                          onClick={() => setSelectedProblem(p)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => openEditProblem(p)}
                          title="Edit problem"
                          className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteProblem(String(p.id), p.title)}
                          title="Delete problem"
                          className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit problem modal */}
      {editingProblem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl shadow-gray-300/40 dark:shadow-black/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-50">Edit Problem</h2>
              <button
                onClick={() => setEditingProblem(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-5">
              <ProblemFormFields
                titleId="edit-title"
                titleValue={editTitle}
                onTitleChange={setEditTitle}
                difficultyValue={editDifficulty}
                onDifficultyChange={setEditDifficulty}
                descriptionId="edit-description"
                descriptionValue={editDescription}
                onDescriptionChange={setEditDescription}
                timeLimitMs={editTimeLimitMs}
                onTimeLimitMsChange={setEditTimeLimitMs}
                testCases={editTestCases}
                onTestCaseChange={handleEditTestCaseChange}
                onAddTestCase={() =>
                  setEditTestCases([
                    ...editTestCases,
                    { input: "", output: "", isHidden: false, uid: uid() },
                  ])
                }
                onRemoveTestCase={(index) =>
                  setEditTestCases(editTestCases.filter((_, i) => i !== index))
                }
                onToggleHidden={toggleEditTestCaseHidden}
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProblem(null)}
                  className="bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-semibold py-2 px-6 rounded-lg text-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-6 rounded-lg text-sm transition-all shadow-lg shadow-indigo-900/20 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Problem detail modal */}
      {selectedProblem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl shadow-gray-300/40 dark:shadow-black/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-slate-50">
                  {selectedProblem.title}
                </h2>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${difficultyStyle[selectedProblem.difficulty] ?? "text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700"}`}
                >
                  {selectedProblem.difficulty}
                </span>
              </div>
              <button
                onClick={() => setSelectedProblem(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <section>
                <h3 className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-3">
                  Description
                </h3>
                <div className="bg-gray-50 dark:bg-slate-950/60 p-5 rounded-xl border border-gray-200 dark:border-slate-800 text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {selectedProblem.description}
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3">
                  Test Cases
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {(() => {
                    const data = selectedProblem as any;
                    const tcs = data.testCases || data.test_cases || [];

                    if (tcs.length > 0) {
                      return tcs.map((tc: any, idx: number) => (
                        <div
                          key={`modal-tc-${idx}`}
                          className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-200 dark:border-slate-700/50"
                        >
                          <div>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold mb-1.5 uppercase">
                              Input
                            </p>
                            <code className="text-indigo-600 dark:text-indigo-300 font-mono text-xs block bg-gray-50 dark:bg-slate-950/60 p-2.5 rounded-lg">
                              {tc.input || "N/A"}
                            </code>
                          </div>
                          <div className="border-l border-gray-200 dark:border-slate-700 pl-4">
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold mb-1.5 uppercase">
                              Expected Output
                            </p>
                            <code className="text-emerald-600 dark:text-emerald-300 font-mono text-xs block bg-gray-50 dark:bg-slate-950/60 p-2.5 rounded-lg">
                              {tc.expected_output || tc.output || "N/A"}
                            </code>
                          </div>
                        </div>
                      ));
                    }
                    return (
                      <div className="p-4 bg-gray-50 dark:bg-slate-800/30 rounded-xl border border-gray-200 dark:border-slate-700/50 text-gray-400 dark:text-slate-500 text-sm italic">
                        No test cases available.
                      </div>
                    );
                  })()}
                </div>
              </section>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex justify-end flex-shrink-0">
              <button
                onClick={() => setSelectedProblem(null)}
                className="bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-semibold py-2 px-6 rounded-lg text-sm transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewerDashboard;
