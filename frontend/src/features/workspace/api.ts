import { apiClient } from "../../services/apiClient";
import { Submission } from "../../types/submission";

interface SubmitRequest {
  problemId: string;
  code: string;
  language: string;
}

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

const getSubmission = async (id: string): Promise<Submission> => {
  const res = await apiClient.get<Submission>(`/submissions/${id}`);
  return res.data;
};

export const submitCode = async (data: SubmitRequest): Promise<Submission> => {
  const res = await apiClient.post<Submission>("/submissions", data);
  const submission = res.data;

  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const sub = await getSubmission(submission.id);
    if (TERMINAL_STATUSES.has(sub.status)) {
      return sub;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return { ...submission, status: "Pending" };
};
