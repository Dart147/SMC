import { Theme, THEME_CONFIG } from "../constants";

interface ConsolePanelProps {
  theme: Theme;
}

export function ConsolePanel({ theme }: ConsolePanelProps) {
  // 取得目前的主題設定
  const colors = THEME_CONFIG[theme];

  return (
    <div style={{ 
      height: "100%", 
      background: colors.bg, 
      color: colors.text,
      display: "flex",
      flexDirection: "column",
      transition: "all 0.2s ease" 
    }}>
      {/* Console 的 Header */}
      <div style={{ 
        padding: "8px 16px", 
        background: colors.headerBg, 
        borderBottom: `1px solid ${colors.border}`, 
        fontSize: "13px", 
        display: "flex", 
        gap: "16px" 
      }}>
        <span style={{ color: colors.text, cursor: "pointer", borderBottom: `2px solid ${colors.text}` }}>Testcases</span>
        <span style={{ color: "#888", cursor: "pointer" }}>Test Result</span>
      </div>
      
      {/* Console 的內容 */}
      <div style={{ padding: "16px", flex: 1, overflowY: "auto" }}>
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>nums =</div>
          <div style={{ background: colors.secondaryBg, padding: "8px", borderRadius: "4px", fontFamily: "monospace" }}>[2,7,11,15]</div>
        </div>
        <div>
          <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>target =</div>
          <div style={{ background: colors.secondaryBg, padding: "8px", borderRadius: "4px", fontFamily: "monospace" }}>9</div>
        </div>
      </div>
    </div>
  );
}