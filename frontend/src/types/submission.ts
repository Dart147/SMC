export type SubmissionStatus =
  | "Pending"
  | "Accepted"
  | "Wrong Answer"
  | "Time Limit Exceeded"
  | "Memory Limit Exceeded"
  | "Runtime Error"
  | "Compile Error";

export interface Submission {
  id: string;
  problemId: string;
  code: string;
  language: string;
  status: SubmissionStatus;
  output?: string;
  expectedOutput?: string;
  error?: string;
  passedTestCases: number;
  totalTestCases: number;
}
