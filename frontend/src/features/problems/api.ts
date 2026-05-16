import { apiClient } from "../../services/apiClient";
import { Problem } from "../../types/problem";

export const fetchProblems = async (): Promise<Problem[]> => {
  const res = await apiClient.get<Problem[]>("/problems");
  return res.data;
};

export const fetchProblemById = async (id: string): Promise<Problem> => {
  const res = await apiClient.get<Problem>(`/problems/${id}`);
  return res.data;
};
