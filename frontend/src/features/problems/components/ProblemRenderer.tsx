import React from "react";

interface ProblemRendererProps {
  content: string;
}

export const ProblemRenderer: React.FC<ProblemRendererProps> = ({ content }) => {
  return (
    // 加入 dark:prose-invert 支援深色模式，加入 max-w-none 讓它填滿寬度而不是變成窄版的部落格文章
    <div className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none p-6 bg-white dark:bg-gray-900 transition-colors">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
};
