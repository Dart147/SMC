import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ResizeHandle } from "./ResizeHandle";

// Mock 掉複雜的 Separator，單純驗證屬性傳遞
vi.mock("react-resizable-panels", () => ({
  Separator: vi.fn((props) => <div data-testid="separator" style={props.style} />),
}));

describe("ResizeHandle Component", () => {
  it("預設為水平分割 (horizontal)，應有對應的高寬與游標", () => {
    render(<ResizeHandle />);
    const separator = screen.getByTestId("separator");

    expect(separator).toHaveStyle({
      width: "6px",
      height: "100%",
      cursor: "col-resize",
    });
  });

  it("設定為垂直分割 (vertical) 時，應改變高寬與游標", () => {
    render(<ResizeHandle direction="vertical" />);
    const separator = screen.getByTestId("separator");

    expect(separator).toHaveStyle({
      width: "100%",
      height: "6px",
      cursor: "row-resize",
    });
  });
});
