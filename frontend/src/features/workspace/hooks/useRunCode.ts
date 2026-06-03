import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitCode, getSubmission } from "../api";
import { useWorkspaceStore } from "../store";

const TERMINAL_STATUSES = new Set([
  "Accepted",
  "Wrong Answer",
  "Time Limit Exceeded",
  "Memory Limit Exceeded",
  "Runtime Error",
  "Compile Error",
]);
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 30000;

export const useRunCode = (problemId: string) => {
  const [isRunning, setIsRunning] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const { code, language, setResult } = useWorkspaceStore();
  const navigate = useNavigate();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const runCode = async () => {
    setIsRunning(true);
    setTimedOut(false);
    setResult(null);

    let submission: Awaited<ReturnType<typeof submitCode>>;
    try {
      submission = await submitCode({ problemId, code, language });
    } catch (error: any) {
      setResult({
        id: "",
        problemId,
        code,
        language,
        status: "Runtime Error",
        error: error.response?.data?.error || error.message || "連線失敗或伺服器發生異常",
        passedTestCases: 0,
        totalTestCases: 0,
      });
      setIsRunning(false);
      return;
    }

    const deadline = Date.now() + POLL_TIMEOUT_MS;

    intervalRef.current = setInterval(async () => {
      try {
        const sub = await getSubmission(submission.id);
        setResult(sub);

        if (TERMINAL_STATUSES.has(sub.status)) {
          clearPoll();
          setIsRunning(false);
          navigate("/results", { state: { submissionId: submission.id } });
          return;
        }
      } catch {
        // network blip — keep polling
      }

      if (Date.now() >= deadline) {
        clearPoll();
        setIsRunning(false);
        setTimedOut(true);
        navigate("/results", { state: { submissionId: submission.id, stillPending: true } });
      }
    }, POLL_INTERVAL_MS);
  };

  return { runCode, isRunning, timedOut };
};
