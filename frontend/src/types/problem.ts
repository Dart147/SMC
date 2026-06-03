export type Difficulty = "Easy" | "Medium" | "Hard";

export interface TestCase {
  input: string;
  expected_output: string;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  testCases?: TestCase[];
}
