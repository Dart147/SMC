import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProblemDescription } from "./ProblemDescription";
import { Problem } from "../../../types/problem";

const baseProblem: Problem = {
  id: "p1",
  title: "Two Sum",
  difficulty: "Easy",
  description: "這是題目的 **Markdown** 敘述。",
};

describe("ProblemDescription", () => {
  it("應該正確渲染標題與 Markdown 內容", () => {
    render(<ProblemDescription problem={baseProblem} />);
    expect(screen.getByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("Markdown")).toBeInTheDocument();
    expect(screen.getByText(/這是題目的/)).toBeInTheDocument();
  });

  describe("難易度標籤測試 (getDifficultyBadge)", () => {
    it("當難度為 Easy 時，應顯示綠色標籤", () => {
      render(<ProblemDescription problem={{ ...baseProblem, difficulty: "Easy" }} />);
      const badge = screen.getByText("Easy");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("text-green-700", "bg-green-100");
    });

    it("當難度為 Medium 時，應顯示黃色標籤", () => {
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

  it("renders inline code via markdown", () => {
    render(
      <ProblemDescription
        problem={{ ...baseProblem, description: "Use `nums[i]` to access." }}
      />,
    );
    expect(screen.getByText(/nums\[i\]/)).toBeInTheDocument();
  });

  it("renders h3 heading via markdown", () => {
    render(
      <ProblemDescription
        problem={{ ...baseProblem, description: "### Examples\n\nSome text." }}
      />,
    );
    expect(screen.getByText("Examples")).toBeInTheDocument();
  });

  it("renders unordered list via markdown", () => {
    render(
      <ProblemDescription
        problem={{ ...baseProblem, description: "- item one\n- item two" }}
      />,
    );
    expect(screen.getByText("item one")).toBeInTheDocument();
  });

  it("renders ordered list via markdown", () => {
    render(
      <ProblemDescription
        problem={{ ...baseProblem, description: "1. first\n2. second" }}
      />,
    );
    expect(screen.getByText("first")).toBeInTheDocument();
  });

  it("renders language code block via markdown", () => {
    render(
      <ProblemDescription
        problem={{
          ...baseProblem,
          description: "```go\nfunc twoSum() {}\n```",
        }}
      />,
    );
    expect(screen.getByText(/twoSum/)).toBeInTheDocument();
  });

  it("renders ExampleBlock for Input/Output pre block", () => {
    render(
      <ProblemDescription
        problem={{
          ...baseProblem,
          description: "```\nInput: [2,7]\nOutput: [0,1]\n```",
        }}
      />,
    );
    expect(screen.getByText(/\[2,7\]/)).toBeInTheDocument();
    expect(screen.getByText(/\[0,1\]/)).toBeInTheDocument();
  });

  it("renders ExampleBlock with explanation", () => {
    render(
      <ProblemDescription
        problem={{
          ...baseProblem,
          description: "```\nInput: [2,7]\nOutput: [0,1]\nExplanation: add them.\n```",
        }}
      />,
    );
    expect(screen.getByText(/add them/)).toBeInTheDocument();
  });
});
