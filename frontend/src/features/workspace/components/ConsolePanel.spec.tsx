import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConsolePanel } from "./ConsolePanel";
import { useWorkspaceStore } from "../store";
import type { Theme } from "../constants";

const defaultTheme: Theme = "vs-dark";

describe("ConsolePanel", () => {
  beforeEach(() => {
    act(() => {
      useWorkspaceStore.setState({ result: null });
    });
  });

  it("renders without crashing with no result", () => {
    render(<ConsolePanel theme={defaultTheme} />);
    expect(screen.getByText("Testcases")).toBeInTheDocument();
  });

  it("renders test cases tab by default", () => {
    render(<ConsolePanel theme={defaultTheme} />);
    expect(screen.getByText("Testcases")).toBeInTheDocument();
  });

  it("renders sample test case input when provided", () => {
    const sampleTestCase = { input: "2 7\n9\n", expectedOutput: "0 1\n", isHidden: false };
    render(<ConsolePanel theme={defaultTheme} sampleTestCase={sampleTestCase as any} />);
    expect(screen.getByText(/2 7/)).toBeInTheDocument();
  });

  it("shows Run button and calls onRun when clicked", () => {
    const onRun = vi.fn();
    render(<ConsolePanel theme={defaultTheme} onRun={onRun} />);
    const button = screen.getByText(/Run sample/i);
    fireEvent.click(button);
    expect(onRun).toHaveBeenCalled();
  });

  it("switches to result tab when result is set", async () => {
    render(<ConsolePanel theme={defaultTheme} />);
    act(() => {
      useWorkspaceStore.setState({
        result: {
          id: "s1",
          problemId: "1",
          code: "",
          language: "go",
          status: "Accepted",
          output: "0 1\n",
          expectedOutput: "0 1\n",
          error: "",
          passedTestCases: 1,
          totalTestCases: 1,
        } as any,
      });
    });
    expect(screen.getByText(/Result/i)).toBeInTheDocument();
  });

  it("renders in light theme without crashing", () => {
    render(<ConsolePanel theme="vs-light" />);
    expect(screen.getByText("Testcases")).toBeInTheDocument();
  });

  it("shows Running text when isRunSample is true", () => {
    render(<ConsolePanel theme={defaultTheme} isRunSample={true} onRun={vi.fn()} />);
    expect(screen.getByText("Running...")).toBeInTheDocument();
  });
});
