import React from "react";
import { Outlet, Link } from "react-router-dom";

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <nav className="bg-gray-900 text-white p-4 flex gap-6 shadow">
        <Link to="/" className="font-bold text-lg">
          OJ Platform
        </Link>
        <Link to="/" className="hover:text-gray-300 transition-colors">
          Home
        </Link>
        <Link to="/problems" className="hover:text-gray-300 transition-colors">
          Problems
        </Link>
        <Link to="/workspace" className="hover:text-gray-300 transition-colors">
          Workspace
        </Link>
      </nav>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};
