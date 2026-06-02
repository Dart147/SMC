import { BrowserRouter, Routes, Route } from "react-router-dom";
import InterviewerPage from "./pages/interviewer";
import { MainLayout } from "./layouts/MainLayout";
import { Home } from "./pages/Home";
import { ProblemList } from "./pages/ProblemList";
import { Workspace } from "./pages/Workspace";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Login } from "./pages/Login";
import { DisclaimerPage } from "./pages/DisclaimerPage";
import { ExamLayout } from "./layouts/ExamLayout";
import { CandidateList } from "./pages/CandidateList";
import { RequireAuth } from "./components/RequireAuth";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<RequireAuth />}>
            <Route path="/" element={<Home />} />
            <Route path="/disclaimer" element={<DisclaimerPage />} />

            <Route element={<MainLayout />}>
              <Route path="/interviewer" element={<InterviewerPage />} />
              <Route path="/submissions" element={<CandidateList />} />

              <Route element={<ExamLayout />}>
                <Route path="/problems" element={<ProblemList />} />
                <Route path="/workspace/:problemId" element={<Workspace />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
