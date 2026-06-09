import { describe, it, expect } from "vitest";
import { SKELETONS, THEME_CONFIG } from "./constants";
import type { Language, Theme } from "./constants";

describe("workspace constants", () => {
  it("SKELETONS has entries for all languages", () => {
    const langs: Language[] = ["javascript", "python", "go", "c", "cpp"];
    for (const lang of langs) {
      expect(SKELETONS[lang]).toBeTruthy();
      expect(typeof SKELETONS[lang]).toBe("string");
    }
  });

  it("THEME_CONFIG has entries for both themes", () => {
    const themes: Theme[] = ["vs-dark", "vs-light"];
    for (const theme of themes) {
      const cfg = THEME_CONFIG[theme];
      expect(cfg).toBeTruthy();
      expect(cfg.bg).toBeTruthy();
      expect(cfg.text).toBeTruthy();
      expect(cfg.border).toBeTruthy();
      expect(cfg.accent).toBeTruthy();
    }
  });

  it("dark and light themes have different backgrounds", () => {
    expect(THEME_CONFIG["vs-dark"].bg).not.toBe(THEME_CONFIG["vs-light"].bg);
  });
});
