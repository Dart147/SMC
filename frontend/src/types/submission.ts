export interface Submission {
  id: string;
  problemId: string;
  code: string;
  language: string;
  status: string;
  output?: string;
  expectedOutput?: string;
  error?: string;
  passedTestCases: number;
  totalTestCases: number;
}
