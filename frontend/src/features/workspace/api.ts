import { apiClient } from "../../services/apiClient";

interface SubmitRequest {
  problemId: string;
  code: string;
  language: string;
}

interface Submission {
  id: string;
  problemId: string;
  code: string;
  language: string;
  status: string;
}

export const submitCode = async (data: SubmitRequest): Promise<{ output: string }> => {
  const res = await apiClient.post<Submission>("/submissions", data);
  return { output: `Submission received.\nStatus: ${res.data.status}\nID: ${res.data.id}` };
};
