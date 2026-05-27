import { useState, useEffect } from "react";
import { apiClient } from "../../../services/api"; // 你的 axios 實體
import { useDebounce } from "../../../hooks/useDebounce";

interface UseWorkspaceSyncProps {
  problemId: string;
  defaultLang: string;
  skeletons: Record<string, string>; // 傳入所有語言的預設模板包
}

export const useWorkspaceSync = ({ problemId, defaultLang, skeletons }: UseWorkspaceSyncProps) => {
  const [language, setLanguage] = useState<string>(defaultLang);
  const [code, setCode] = useState<string>("");
  const [isInitializing, setIsInitializing] = useState<boolean>(true); // 控制載入畫面，避免閃爍

  const debouncedCode = useDebounce(code, 500);

  //  初始化邏輯：元件掛載或切換題目時觸發
  useEffect(() => {
    const initializeWorkspace = async () => {
      setIsInitializing(true);
      try {
        //  第一道防線：檢查 LocalStorage (看有沒有上次選的語言與草稿)
        const savedLang = localStorage.getItem(`smc_lang_${problemId}`);
        const targetLang = savedLang || defaultLang;
        const savedCode = localStorage.getItem(`smc_draft_${problemId}_${targetLang}`);

        if (savedCode) {
          // LocalStorage 有資料，直接恢復！
          setLanguage(targetLang);
          setCode(savedCode);
          return;
        }

        //  第二道防線：LocalStorage 沒東西，向 DB 請求最後一次的 Submission
        const response = await apiClient.get(`/submissions/latest`, {
          params: { problemId }
        });
        
        const latestSub = response.data;

        if (latestSub && latestSub.code) {
          // DB 有紀錄！覆寫語言與程式碼
          setLanguage(latestSub.language);
          setCode(latestSub.code);
          
          // 順手存回 LocalStorage，下次重新整理就不用再打 API 了
          localStorage.setItem(`smc_lang_${problemId}`, latestSub.language);
          localStorage.setItem(`smc_draft_${problemId}_${latestSub.language}`, latestSub.code);
        } else {
          // 3️⃣ 第三道防線：DB 也沒有紀錄，真的是第一次寫這題
          setLanguage(targetLang);
          setCode(skeletons[targetLang]);
        }
      } catch (error) {
        // 如果 API 報錯 (例如 404 找不到紀錄)，直接退回第三道防線 (預設模板)
        const targetLang = localStorage.getItem(`smc_lang_${problemId}`) || defaultLang;
        setLanguage(targetLang);
        setCode(skeletons[targetLang]);
      } finally {
        setIsInitializing(false); // 初始化完成
      }
    };

    initializeWorkspace();
  }, [problemId]); // 只有在切換問題時重新初始化

  //  自動存檔邏輯 1：當「語言」改變時，寫入 LocalStorage 並切換對應草稿
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    localStorage.setItem(`smc_lang_${problemId}`, newLang);

    // 切換語言時，嘗試載入該語言的舊草稿，沒有的話就給預設模板
    const existingDraft = localStorage.getItem(`smc_draft_${problemId}_${newLang}`);
    setCode(existingDraft || skeletons[newLang]);
  };

  //  自動存檔邏輯 2：當「程式碼」改變 (且過了防抖動時間) 時，寫入 LocalStorage
  useEffect(() => {
    if (!isInitializing && debouncedCode) {
      localStorage.setItem(`smc_draft_${problemId}_${language}`, debouncedCode);
    }
  }, [debouncedCode, language, problemId, isInitializing]);

  return { 
    language, 
    handleLanguageChange, 
    code, 
    setCode, 
    isInitializing 
  };
};