import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProblemDescription } from "./ProblemDescription";
import { Problem } from "../../../types/problem";

// 準備一個基礎的假題目資料
const baseProblem: Problem = {
  id: "p1",
  title: "Two Sum",
  difficulty: "Easy",
  description: "這是題目的 **Markdown** 敘述。",
  // ...如果你的 Problem 還有其他必填欄位 (如 tags, category 等)，請在這裡補上任意字串
};

describe("ProblemDescription", () => {
  it("應該正確渲染標題與 Markdown 內容", () => {
    render(<ProblemDescription problem={baseProblem} />);

    // 驗證標題
    expect(screen.getByText("Two Sum")).toBeInTheDocument();

    // 驗證 Markdown 轉換後的文字 (ReactMarkdown 會把 **Markdown** 轉成文字)
    expect(screen.getByText("Markdown")).toBeInTheDocument();
    expect(screen.getByText(/這是題目的/)).toBeInTheDocument();
  });

  describe("難易度標籤測試 (getDifficultyBadge)", () => {
    it("當難度為 Easy 時，應顯示綠色標籤", () => {
      render(<ProblemDescription problem={{ ...baseProblem, difficulty: "Easy" }} />);

      const badge = screen.getByText("Easy");
      expect(badge).toBeInTheDocument();
      // 驗證是否包含 Easy 對應的 Tailwind class
      expect(badge).toHaveClass("text-green-700", "bg-green-100");
    });

    it("當難度為 Medium 時，應顯示黃色標籤", () => {
      // 透過 rerender 功能，我們可以快速更改傳入的 Props
      render(<ProblemDescription problem={{ ...baseProblem, difficulty: "Medium" }} />);

      const badge = screen.getByText("Medium");
      expect(badge).toHaveClass("text-yellow-700", "bg-yellow-100");
    });

    it("當難度為 Hard (或其他) 時，應顯示紅色標籤", () => {
      render(<ProblemDescription problem={{ ...baseProblem, difficulty: "Hard" }} />);

      const badge = screen.getByText("Hard");
      expect(badge).toHaveClass("text-red-700", "bg-red-100");
    });
  });
});
