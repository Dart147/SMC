import { apiClient } from "../../services/api";
import { Submission } from "../../types/submission";

interface SubmitRequest {
  problemId: string;
  code: string;
  language: string;
}

// Thin POST — returns the initial pending submission. Polling is owned by useRunCode.
export const submitCode = async (data: SubmitRequest): Promise<Submission> => {
  const res = await apiClient.post<Submission>("/submissions", data);
  return res.data;
};

export const getSubmission = async (id: string): Promise<Submission> => {
  const res = await apiClient.get<Submission>(`/submissions/${id}`);
  return res.data;
};
