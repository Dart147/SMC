import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./Button";

describe("Button Component", () => {
  it("應正確渲染預設 (primary) 按鈕", () => {
    render(<Button>Click Me</Button>);
    const button = screen.getByRole("button", { name: "Click Me" });

    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-blue-600", "text-white"); // Primary 樣式
  });

  it("應正確渲染 secondary 按鈕", () => {
    render(<Button variant="secondary">Cancel</Button>);
    const button = screen.getByRole("button", { name: "Cancel" });

    expect(button).toHaveClass("bg-gray-200", "text-gray-800"); // Secondary 樣式
  });

  it("點擊時應觸發 onClick 事件", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);

    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("應支援傳入自訂的 className 並合併", () => {
    render(<Button className="w-full mt-4">Full Width</Button>);
    const button = screen.getByRole("button");

    expect(button).toHaveClass("w-full", "mt-4");
  });
});
