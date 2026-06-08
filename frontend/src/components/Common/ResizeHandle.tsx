import { Separator } from "react-resizable-panels";
import { useTheme } from "../../contexts/ThemeContext";

export function ResizeHandle({
  direction = "horizontal",
}: {
  direction?: "horizontal" | "vertical";
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const restColor = isDark ? "#2d2d2d" : "#e5e7eb";
  const hoverColor = isDark ? "#007acc" : "#6366f1";

  return (
    <Separator
      style={{
        width: direction === "horizontal" ? "6px" : "100%",
        height: direction === "horizontal" ? "100%" : "6px",
        backgroundColor: restColor,
        cursor: direction === "horizontal" ? "col-resize" : "row-resize",
        transition: "background-color 0.2s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverColor)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = restColor)}
    />
  );
}
