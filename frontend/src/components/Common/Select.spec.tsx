import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Select } from "./Select";

describe("Select Component", () => {
  const options = [
    { value: "python", label: "Python" },
    { value: "cpp", label: "C++" },
  ];

  it("預設應顯示選中的值或 Placeholder，且不顯示下拉選單", () => {
    render(<Select options={options} value="" placeholder="Choose Language" onChange={vi.fn()} />);

    expect(screen.getByText("Choose Language")).toBeInTheDocument();
    expect(screen.queryByText("Python")).not.toBeInTheDocument(); // 下拉選單未展開
  });

  it("點擊按鈕應展開下拉選單，並能觸發 onChange", () => {
    const handleChange = vi.fn();
    render(<Select options={options} value="cpp" onChange={handleChange} />);

    // 檢查已選中的值
    expect(screen.getByText("C++")).toBeInTheDocument();

    // 展開選單
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Python")).toBeInTheDocument();

    // 選擇 Python
    fireEvent.click(screen.getByText("Python"));
    expect(handleChange).toHaveBeenCalledWith("python");
  });

  it("點擊元件外部應自動關閉下拉選單", () => {
    render(
      <div>
        <div data-testid="outside">Outside Area</div>
        <Select options={options} value="" onChange={vi.fn()} />
      </div>,
    );

    // 點開
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Python")).toBeInTheDocument();

    // 點擊外部
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByText("Python")).not.toBeInTheDocument();
  });
});
