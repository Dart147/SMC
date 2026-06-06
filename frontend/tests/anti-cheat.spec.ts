// tests/anti-cheat.spec.ts
import { test, expect } from "@playwright/test";

test.describe("SMC Anti-Cheat System (防作弊系統 E2E 測試)", () => {
  test.beforeEach(async ({ page }) => {
    // 1. 進入登入頁面
    await page.goto("http://localhost:8080/login");

    // 2. 填入指定的測試帳號與密碼
    await page.getByPlaceholder("請輸入面試通知上的帳號").fill("USER-2853");
    await page.getByPlaceholder("請輸入密碼").fill("3D5Q47");
    await page.getByRole("button", { name: "進入工作區" }).click();

    // ==========================================
    // 🌟 新增：處理免責聲明 (Disclaimer) 流程
    // ==========================================
    // 3. 確保已經來到免責聲明頁面
    await page.waitForURL("**/disclaimer");

    // 💡 E2E 測試黑魔法：蓋掉真實的全螢幕 API，避免自動化瀏覽器拒絕權限導致報錯
    await page.evaluate(() => {
      document.documentElement.requestFullscreen = () => Promise.resolve();
    });

    // 點擊同意按鈕
    await page.getByRole("button", { name: "我已瞭解規範，進入全螢幕開考" }).click();

    // ==========================================
    // 4. 等待跳轉並進入題目列表
    await page.waitForURL("**/problems");

    // 5. 點擊第一題進入工作區
    await page.getByText("Two Sum").first().click();

    // 6. 確認已成功進入 Workspace
    await page.waitForURL("**/workspace/**");

    // 稍微等待防弊 Hook 初始化完成
    await page.waitForTimeout(1000);
  });

  test("連續 3 次觸發失焦，系統應正確顯示警告、累加次數並強制踢出", async ({ page }) => {
    // 💡 新增：作弊觸發小幫手 (黑魔法竄改 document.hidden)
    const simulateTabSwitch = async () => {
      await page.evaluate(() => {
        // 1. 強制覆寫 document.hidden 為 true
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        // 2. 發送事件 (這時你的 Hook 就會上當了！)
        document.dispatchEvent(new Event("visibilitychange"));
        // 3. 恢復原狀，假裝使用者又切回來了，以免影響後續 UI 點擊
        Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      });
    };

    // =========================================================
    // 🚨 第一次違規 (Strike 1)
    // =========================================================
    await simulateTabSwitch(); // 👈 換成呼叫這個

    await expect(page.getByText("⚠️ 違規警告")).toBeVisible();
    await expect(page.getByText("系統偵測到您已離開全螢幕模式。")).toBeVisible();
    await expect(page.getByText("目前違規次數：1 / 3")).toBeVisible();

    await page.getByRole("button", { name: "點我重新回到全螢幕並繼續作答" }).click();
    await expect(page.getByText("⚠️ 違規警告")).not.toBeVisible();

    // =========================================================
    // 🚨 第二次違規 (Strike 2)
    // =========================================================
    await page.waitForTimeout(1500);

    await simulateTabSwitch(); // 👈 換成呼叫這個

    await expect(page.getByText("⚠️ 違規警告")).toBeVisible();
    await expect(page.getByText("目前違規次數：2 / 3")).toBeVisible();

    await page.getByRole("button", { name: "點我重新回到全螢幕並繼續作答" }).click();
    await expect(page.getByText("⚠️ 違規警告")).not.toBeVisible();

    // =========================================================
    // 🚨 第三次違規 (Strike 3 - 觸發強制交卷)
    // =========================================================
    await page.waitForTimeout(1500);

    // 攔截 ExamLayout.tsx 發出的原生 alert 對話框
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe(
        "🚨 系統偵測您已嚴重違規達 3 次！系統已自動交卷並將您強制登出。",
      );
      await dialog.accept();
    });

    await simulateTabSwitch(); // 👈 換成呼叫這個

    // =========================================================
    // ⚖️ 驗證制裁結果
    // =========================================================
    await page.waitForURL("**/login", { timeout: 5000 });

    const token = await page.evaluate(() => localStorage.getItem("smc_token"));
    expect(token).toBeNull();
  });
});
