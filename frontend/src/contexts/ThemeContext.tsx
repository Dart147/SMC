import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: "dark", // 預設還是我們帥氣的深色模式
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children, defaultTheme = "dark", ...props }: ThemeProviderProps) {
  // 從 localStorage 讀取上次的設定，如果沒有就用預設的
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("vite-ui-theme") as Theme) || defaultTheme,
  );

  useEffect(() => {
    const root = window.document.documentElement;

    // 每次 theme 改變時，先移除舊的，再掛上新的 class
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem("vite-ui-theme", theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// 建立一個 Hook 方便其他元件使用
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
