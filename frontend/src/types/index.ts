export interface Problem {
  id: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  content: string;
}

export interface Submission {
  id: number;
  problemId: number;
  code: string;
  language: string;
  status: "Pending" | "Accepted" | "Wrong Answer" | "Time Limit Exceeded";
}
