import { apiClient } from "../../services/api";
import { Problem } from "../../types/problem";

export const fetchProblems = async (): Promise<Problem[]> => {
  const res = await apiClient.get<Problem[]>("/problems");
  return res.data;
};

export const fetchProblemById = async (id: string): Promise<Problem> => {
  const res = await apiClient.get<Problem>(`/problems/${id}`);
  return res.data;
};

/** 考生專用：取得自己被指派的題目（需 JWT） */
export const fetchMyProblems = async (): Promise<Problem[]> => {
  const res = await apiClient.get<Problem[]>("/my-problems");
  return res.data;
};

/** 面試官：指派題目給考生 */
export const assignProblem = async (userId: string, problemId: string): Promise<void> => {
  await apiClient.post("/admin/assign-problem", { userId, problemId });
};

/** 面試官：刪除題目 */
export const deleteProblem = async (problemId: string): Promise<void> => {
  await apiClient.delete(`/problems/${problemId}`);
};

interface UpdateProblemPayload {
  title: string;
  difficulty: string;
  description: string;
  testCases: { input: string; expected_output: string }[];
}

/** 面試官：更新題目 */
export const updateProblem = async (problemId: string, data: UpdateProblemPayload): Promise<void> => {
  await apiClient.put(`/problems/${problemId}`, data);
};

/** 面試官：取消指派 */
export const unassignProblem = async (userId: string, problemId: string): Promise<void> => {
  await apiClient.delete("/admin/assign-problem", { data: { userId, problemId } });
};

/** 面試官：取得某考生已被指派的題目 ID 清單 */
export const fetchCandidateAssignments = async (userId: string): Promise<string[]> => {
  const res = await apiClient.get<string[]>(`/admin/candidate-assignments?userId=${userId}`);
  return res.data;
};
