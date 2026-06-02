import React, { useEffect } from "react";

interface ProblemRendererProps {
  content: string;
}

export const ProblemRenderer: React.FC<ProblemRendererProps> = ({ content }) => {
  
  useEffect(() => {
    // 這裡我們直接使用原生的 window 物件，不依賴任何外部 API
    const handleBlur = () => {
      // 當使用者點擊視窗外或切換頁面時觸發
      alert("⚠️ 警告：偵測到您已離開測驗頁面！此行為將會被記錄。");
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return (
    <div className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none p-6 bg-white dark:bg-gray-900 transition-colors">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
};