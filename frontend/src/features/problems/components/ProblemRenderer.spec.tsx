import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProblemRenderer } from "./ProblemRenderer";

describe("ProblemRenderer", () => {
  it("應該正確渲染傳入的 HTML 字串，並轉換為真實 DOM", () => {
    // 準備一段假的 HTML 內容
    const mockHtml = `
      <h1>這是大標題</h1>
      <p>這是一段<strong>重要</strong>的敘述。</p>
    `;

    // 渲染元件
    const { container } = render(<ProblemRenderer content={mockHtml} />);

    // 驗證 1: 畫面上是否有出現解析後的文字？
    expect(screen.getByRole("heading", { level: 1, name: "這是大標題" })).toBeInTheDocument();
    expect(screen.getByText(/這是一段/)).toBeInTheDocument();
    expect(screen.getByText("重要")).toBeInTheDocument(); // 檢查粗體字是否被解析出來

    // 驗證 2: 外層容器是否帶有設定好的 Tailwind classes？
    expect(container.firstChild).toHaveClass("prose", "dark:prose-invert", "max-w-none");
  });
});
