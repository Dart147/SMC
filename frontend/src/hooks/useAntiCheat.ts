import { useEffect, useRef } from "react";

export const useAntiCheat = (onCheatDetected: () => void) => {
  // 用 useRef 確保短時間內不會重複觸發 (Cooldown 機制)
  const isTriggering = useRef(false);

  useEffect(() => {
    const trigger = (reason: string) => {
      if (isTriggering.current) return;
      console.log(`🚨 [防弊系統] 違規原因: ${reason}`);

      isTriggering.current = true;
      onCheatDetected();

      // 1 秒後才允許再次觸發，避免一次退出產生多個警告
      setTimeout(() => {
        isTriggering.current = false;
      }, 1000);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) trigger("切換分頁或縮小視窗");
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) trigger("離開全螢幕 (事件偵測)");
    };

    // 🌟 終極防線：用視窗大小來算！只要視窗高度不等於螢幕高度，就是退出全螢幕了
    const handleResize = () => {
      // 容錯範圍 5px，避免某些瀏覽器邊框計算誤差
      const isNotFull = Math.abs(window.innerHeight - window.screen.height) > 5;
      if (isNotFull && !document.fullscreenElement) {
        trigger("離開全螢幕 (視窗比例異常)");
      }
    };

    const preventDefaultAction = (e: Event) => e.preventDefault();

    const fullscreenEvents = [
      "fullscreenchange",
      "webkitfullscreenchange",
      "mozfullscreenchange",
      "MSFullscreenChange",
    ];

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("resize", handleResize); // 註冊視窗大小監聽
    document.addEventListener("contextmenu", preventDefaultAction);
    document.addEventListener("copy", preventDefaultAction);
    document.addEventListener("paste", preventDefaultAction);

    fullscreenEvents.forEach((evt) => document.addEventListener(evt, handleFullscreenChange));

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("contextmenu", preventDefaultAction);
      document.removeEventListener("copy", preventDefaultAction);
      document.removeEventListener("paste", preventDefaultAction);
      fullscreenEvents.forEach((evt) => document.removeEventListener(evt, handleFullscreenChange));
    };
  }, [onCheatDetected]);
};
