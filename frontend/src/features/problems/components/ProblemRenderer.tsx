import React from "react";

interface ProblemRendererProps {
  content: string;
}

export const ProblemRenderer: React.FC<ProblemRendererProps> = ({ content }) => {
  return (
    <div className="prose lg:prose-xl p-6">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
};
