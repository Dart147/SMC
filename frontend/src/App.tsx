import InterviewerPage from "./pages/interviewer";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { Home } from "./pages/Home";
import { ProblemList } from "./pages/ProblemList";
import { Workspace } from "./pages/Workspace";
import { SubmissionsPage } from "./pages/Submissions";
import { ThemeProvider } from "./contexts/ThemeContext";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="problems" element={<ProblemList />} />
            <Route path="/workspace/:problemId" element={<Workspace />} />
            <Route path="/interviewer" element={<InterviewerPage />} />
            <Route path="submissions" element={<SubmissionsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
