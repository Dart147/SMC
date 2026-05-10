import React from "react";
import { useWorkspaceStore } from "../store";

export const ConsoleOutput: React.FC = () => {
  const { output } = useWorkspaceStore();

  return (
    <div className="h-48 bg-gray-900 text-white p-4 font-mono overflow-auto rounded flex flex-col">
      <h3 className="text-gray-400 mb-2 border-b border-gray-700 pb-1 text-sm uppercase tracking-wide">
        Console Output
      </h3>
      <pre className="whitespace-pre-wrap flex-1">{output || "Ready..."}</pre>
    </div>
  );
};
