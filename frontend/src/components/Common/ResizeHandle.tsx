// 引入 V4 的 Separator
import { Separator } from "react-resizable-panels";

export function ResizeHandle({
  direction = "horizontal",
}: {
  direction?: "horizontal" | "vertical";
}) {
  return (
    <Separator
      style={{
        // 如果是左右分割，把手就是直的一條線；上下分割則是橫的一條線
        width: direction === "horizontal" ? "6px" : "100%",
        height: direction === "horizontal" ? "100%" : "6px",
        backgroundColor: "#2d2d2d",
        cursor: direction === "horizontal" ? "col-resize" : "row-resize",
        transition: "background-color 0.2s ease",
      }}
      // 滑鼠移過去時變色，模仿 LeetCode 的體驗
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#007acc")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2d2d2d")}
    />
  );
}
