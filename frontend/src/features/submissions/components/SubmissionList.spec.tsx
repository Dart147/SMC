import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SubmissionList } from "./SubmissionList";
// 💡 注意：請根據你的專案結構確認 Submission 型別的引入路徑
import { Submission } from "../../../types/submission";

// ---------------------------------------------------------
// 1. 準備各種情境的 Mock 資料
// ---------------------------------------------------------
const mockSubmissions: Submission[] = [
  {
    id: "sub-1",
    problemId: "p1",
    code: "",
    language: "Python",
    status: "Accepted",
    passedTestCases: 5,
    totalTestCases: 5,
  },
  {
    id: "sub-2",
    problemId: "p2",
    code: "",
    language: "C++",
    status: "Pending",
    passedTestCases: 0,
    totalTestCases: 3,
  },
  {
    id: "sub-3",
    problemId: "p3",
    code: "",
    language: "Java",
    status: "Wrong Answer",
    passedTestCases: 1,
    totalTestCases: 3,
    output: "10",
    expectedOutput: "20",
  },
  {
    id: "sub-4",
    problemId: "p4",
    code: "",
    language: "JavaScript",
    status: "Runtime Error",
    passedTestCases: 0,
    totalTestCases: 5,
    error: "TypeError: undefined is not a function",
  },
];

// ---------------------------------------------------------
// 2. 測試案例
// ---------------------------------------------------------
describe("SubmissionList", () => {
  describe("UI 狀態切換測試", () => {
    it("當 isLoading 為 true 且沒有資料時，應顯示載入中畫面", () => {
      render(<SubmissionList submissions={[]} isLoading={true} />);
      expect(screen.getByText("Loading submissions...")).toBeInTheDocument();
    });

    it("當沒有資料時，應顯示空狀態提示", () => {
      render(<SubmissionList submissions={[]} isLoading={false} />);
      expect(
        screen.getByText("No submissions yet. Write some code and submit!"),
      ).toBeInTheDocument();
    });
  });

  describe("清單渲染與互動測試", () => {
    it("應該正確渲染所有的 Submission 摘要資訊", () => {
      render(<SubmissionList submissions={mockSubmissions} />);

      // 檢查狀態有沒有被印出來
      expect(screen.getByText("Accepted")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.getByText("Wrong Answer")).toBeInTheDocument();
      expect(screen.getByText("Runtime Error")).toBeInTheDocument();

      // 檢查 Problem ID 有沒有被印出來
      expect(screen.getByText("Problem p1")).toBeInTheDocument();
      expect(screen.getByText("Problem p4")).toBeInTheDocument();
    });

    it("點擊 Accepted 的列，應該展開成功訊息，再點一次會收合", () => {
      render(<SubmissionList submissions={mockSubmissions} />);

      const acceptedRow = screen.getByText("Problem p1");
      const successMessage = "All test cases passed successfully!";

      // 初始狀態下，不應該看到詳細成功訊息
      expect(screen.queryByText(successMessage)).not.toBeInTheDocument();

      // 點擊展開
      fireEvent.click(acceptedRow);
      expect(screen.getByText(successMessage)).toBeInTheDocument();

      // 再點一次收合
      fireEvent.click(acceptedRow);
      expect(screen.queryByText(successMessage)).not.toBeInTheDocument();
    });

    it("點擊 Wrong Answer 的列，應該展開 Your Output 和 Expected Output", () => {
      render(<SubmissionList submissions={mockSubmissions} />);

      // 點擊展開 Problem p3 (Wrong Answer)
      fireEvent.click(screen.getByText("Problem p3"));

      // 驗證標題是否出現
      expect(screen.getByText("Your Output")).toBeInTheDocument();
      expect(screen.getByText("Expected Output")).toBeInTheDocument();

      // 驗證我們給的假資料 (10 和 20) 是否有被印出來
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("20")).toBeInTheDocument();
    });

    it("點擊 Runtime Error 的列，應該展開 Error Log", () => {
      render(<SubmissionList submissions={mockSubmissions} />);

      // 點擊展開 Problem p4 (Runtime Error)
      fireEvent.click(screen.getByText("Problem p4"));

      // 驗證 Error Log 區塊和錯誤訊息是否出現
      expect(screen.getByText("Error Log")).toBeInTheDocument();
      expect(screen.getByText("TypeError: undefined is not a function")).toBeInTheDocument();
    });

    it("一次只能展開一個 (手風琴效果 Accordion)", () => {
      render(<SubmissionList submissions={mockSubmissions} />);

      // 先點開第一個
      fireEvent.click(screen.getByText("Problem p1"));
      expect(screen.getByText(/All test cases passed/)).toBeInTheDocument();

      // 點開第三個
      fireEvent.click(screen.getByText("Problem p3"));

      // 驗證第一個已經被收起來了 (找不到文字)，而第三個的內容出現了
      expect(screen.queryByText(/All test cases passed/)).not.toBeInTheDocument();
      expect(screen.getByText("Your Output")).toBeInTheDocument();
    });
  });
});
