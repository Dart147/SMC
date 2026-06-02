import { Navigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";

export function Home() {
  // 從你寫好的 Zustand store 中取出 token 和 user
  const token = useAuth((state) => state.token);
  const user = useAuth((state) => state.user);

  // 1. 如果沒有 Token 或 User 資訊，踢回登入頁
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // 2. 根據身分 (role) 導向不同的專屬首頁
  if (user.role === "admin") {
    return <Navigate to="/interviewer" replace />;
  } else {
    // 考生登入後，一律先去閱讀防弊宣告
    return <Navigate to="/disclaimer" replace />;
  }
}
