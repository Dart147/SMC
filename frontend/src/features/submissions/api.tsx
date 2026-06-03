import { apiClient } from "../../services/api";
import { Submission } from "../../types/submission";

export const fetchSubmission = async (id: string): Promise<Submission> => {
  const response = await apiClient.get<Submission>(`/submissions/${id}`);
  return response.data;
};
