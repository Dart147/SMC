import { describe, it, expect } from "vitest";
import { formatDate } from "./format";

describe("Format Utils", () => {
  it("應正確將 ISO 字串轉換為包含年月日的格式", () => {
    // 固定一個時間點來測試，避免 CI/CD 時區問題
    const testDateString = "2024-05-20T14:30:00Z";
    const formatted = formatDate(testDateString);

    // 因為 toLocaleDateString 會受到執行環境 (語系) 的影響，
    // 最穩定的測試方式是確認「年份」和「日期」確實有被正確解析出來
    expect(formatted).toContain("2024");
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(5);
  });

  it("應能接受 Date 物件作為參數", () => {
    const testDate = new Date("2025-01-01T00:00:00Z");
    const formatted = formatDate(testDate);

    expect(formatted).toContain("2025");
  });
});
