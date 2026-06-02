// vitest.setup.ts
import "@testing-library/jest-dom";
import { vi } from "vitest";

// 建立一個假的 localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// 把它強行掛載到 Node.js 的全域環境中
vi.stubGlobal("localStorage", localStorageMock);
