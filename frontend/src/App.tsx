import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProblemList } from "./pages/ProblemList";
import { Workspace } from "./pages/Workspace";
// 引入你的 MainLayout...

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 這裡假設你有包一層 Layout，如果沒有可以拿掉 */}
        <Route path="/" element={<Navigate to="/problems" replace />} />
        <Route path="/problems" element={<ProblemList />} />

        {/* 關鍵：加上 :problemId 動態參數 */}
        <Route path="/workspace/:problemId" element={<Workspace />} />
      </Routes>
    </BrowserRouter>
  );
}
