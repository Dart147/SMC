export type SubmissionStatus =
  | "Pending"
  | "Judging"
  | "Accepted"
  | "Wrong Answer"
  | "Time Limit Exceeded"
  | "Memory Limit Exceeded"
  | "Runtime Error"
  | "Compile Error";

export const TERMINAL_STATUSES = new Set<SubmissionStatus>([
  "Accepted",
  "Wrong Answer",
  "Time Limit Exceeded",
  "Memory Limit Exceeded",
  "Runtime Error",
  "Compile Error",
]);

export interface Submission {
  id: string;
  problemId: string;
  problemTitle?: string;
  code: string;
  language: string;
  status: SubmissionStatus;
  output?: string;
  expectedOutput?: string;
  error?: string;
  passedTestCases: number;
  totalTestCases: number;
  score?: number;
  executionTimeMs?: number;
}
