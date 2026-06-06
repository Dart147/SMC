import { describe, it, expect, beforeEach } from "vitest";
import { useWorkspaceStore } from "./store";
import { Submission } from "../../types/submission";

describe("useWorkspaceStore", () => {
  beforeEach(() => {
    // 每次測試前重置 store 狀態
    useWorkspaceStore.setState({
      code: "// Write your code here\n",
      language: "javascript",
      result: null,
    });
  });

  it("應具備正確的初始狀態", () => {
    const state = useWorkspaceStore.getState();
    expect(state.code).toBe("// Write your code here\n");
    expect(state.language).toBe("javascript");
    expect(state.result).toBeNull();
  });

  it("setCode 應能更新程式碼", () => {
    useWorkspaceStore.getState().setCode("console.log('hello');");
    expect(useWorkspaceStore.getState().code).toBe("console.log('hello');");
  });

  it("setLanguage 應能更新語言", () => {
    useWorkspaceStore.getState().setLanguage("python");
    expect(useWorkspaceStore.getState().language).toBe("python");
  });

  it("setResult 應能更新評測結果", () => {
    const mockResult = { id: "123", status: "Accepted" } as Submission;
    useWorkspaceStore.getState().setResult(mockResult);
    expect(useWorkspaceStore.getState().result).toEqual(mockResult);
  });
});
