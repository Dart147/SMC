import axios from "axios";

// ==========================================
// 0. TypeScript 型別定義 (對應 Go 後端的 Structs)
// ==========================================

export interface LoginResponse {
  token: string;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
}

export interface SubmissionRequest {
  problemId: string;
  language: string;
  code: string;
}

export interface SubmissionResponse {
  id: string;
  problemId: string;
  code: string;
  language: string;
  status: string;
  passedTestCases: number;
  totalTestCases: number;
  output?: string;
  expectedOutput?: string;
  error?: string;
}

// ==========================================
// 1. 建立全局共用的 Axios 實例
// ==========================================
export const apiClient = axios.create({
  // 這裡對應你 Go 後端 Docker 開放的 port 與基礎路由
  baseURL: "http://localhost:8081/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// ==========================================
// 2. 請求攔截器 (Request Interceptor)
// 攔截所有發出去的 API，自動在 Header 塞入 JWT Token
// ==========================================
apiClient.interceptors.request.use(
  (config) => {
    // 從 localStorage 取出我們在 useAuth 存入的 Token
    const token = localStorage.getItem("smc_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// ==========================================
// 3. API 呼叫函式 (封裝具體業務邏輯)
// ==========================================

/**
 * [Auth] 使用者登入 (Admin 或 Candidate)
 */
export const login = async (credentials: {
  username: string;
  password: string;
}): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>("/auth/login", credentials);
  return response.data;
};

/**
 * [Interviewer] 創建面試者帳號 (需要 Admin Token)
 * 注意：你的 Go 後端需要實作 POST /api/users 這支路由
 */
export const createCandidate = async (credentials: { username: string; password: string }) => {
  const response = await apiClient.post("/users", credentials);
  return response.data;
};

/**
 * [Problems] 取得題目列表
 */
export const getProblems = async (): Promise<Problem[]> => {
  const response = await apiClient.get<Problem[]>("/problems");
  return response.data;
};

/**
 * [Problems] 取得單一題目詳情
 */
export const getProblem = async (id: string): Promise<Problem> => {
  const response = await apiClient.get<Problem>(`/problems/${id}`);
  return response.data;
};

/**
 * [Submissions] 送出程式碼給 Judge 系統執行
 */
export const submitCode = async (payload: SubmissionRequest): Promise<SubmissionResponse> => {
  const response = await apiClient.post<SubmissionResponse>("/submissions", payload);
  return response.data;
};

/**
 * [Submissions] 輪詢 (Polling) 取得單次批改結果
 */
export const getSubmission = async (id: string): Promise<SubmissionResponse> => {
  const response = await apiClient.get<SubmissionResponse>(`/submissions/${id}`);
  return response.data;
};

/**
 * [Submissions] 取得使用者的歷史送出紀錄
 */
export const getSubmissionsHistory = async (): Promise<SubmissionResponse[]> => {
  const response = await apiClient.get<SubmissionResponse[]>("/submissions");
  return response.data;
};
