// import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { Home } from "./pages/Home";
import { ProblemList } from "./pages/ProblemList";
import { Workspace } from "./pages/Workspace";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="problems" element={<ProblemList />} />
          <Route path="workspace" element={<Workspace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
