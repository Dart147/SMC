import { Theme, THEME_CONFIG } from "../../workspace/constants";

interface ProblemDescriptionProps {
  theme: Theme;
}

export function ProblemDescription({ theme }: ProblemDescriptionProps) {
  // 取得全域主題顏色
  const colors = THEME_CONFIG[theme];

  // 針對深淺色模式，微調「難易度標籤」與「行內程式碼」的底色，確保文字對比度清晰
  const tagBg = theme === "vs-dark" ? "#166534" : "#dcfce7";
  const tagText = theme === "vs-dark" ? "#4ade80" : "#166534";
  const codeBg = theme === "vs-dark" ? "#333333" : "#e5e5e5";

  return (
    <div
      style={{
        padding: "20px 24px",
        height: "100%",
        overflowY: "auto",
        background: colors.bg,
        color: colors.text,
        transition: "all 0.2s ease", // 讓深淺色切換有滑順的漸變效果
      }}
    >
      {/* 標題 */}
      <h1 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "12px", color: colors.text }}>
        1. Two Sum
      </h1>

      {/* 標籤區塊 (難易度、分類) */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <span
          style={{
            color: tagText,
            background: tagBg,
            padding: "4px 10px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          Easy
        </span>
        <span
          style={{
            color: colors.text,
            background: colors.secondaryBg,
            padding: "4px 10px",
            borderRadius: "12px",
            fontSize: "12px",
          }}
        >
          Array
        </span>
        <span
          style={{
            color: colors.text,
            background: colors.secondaryBg,
            padding: "4px 10px",
            borderRadius: "12px",
            fontSize: "12px",
          }}
        >
          Hash Table
        </span>
      </div>

      {/* 題目敘述本體 */}
      <div style={{ lineHeight: "1.6", fontSize: "15px", marginBottom: "24px" }}>
        <p style={{ marginBottom: "12px" }}>
          Given an array of integers{" "}
          <code
            style={{
              background: codeBg,
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "monospace",
            }}
          >
            nums
          </code>{" "}
          and an integer{" "}
          <code
            style={{
              background: codeBg,
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "monospace",
            }}
          >
            target
          </code>
          , return indices of the two numbers such that they add up to{" "}
          <code
            style={{
              background: codeBg,
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "monospace",
            }}
          >
            target
          </code>
          .
        </p>
        <p style={{ marginBottom: "12px" }}>
          You may assume that each input would have <strong>exactly one solution</strong>, and you
          may not use the same element twice.
        </p>
        <p>You can return the answer in any order.</p>
      </div>

      {/* 測試範例 (Example) */}
      <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>Example 1:</h3>
      <div
        style={{
          background: colors.secondaryBg,
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "20px",
          border: `1px solid ${colors.border}`,
          fontFamily: "monospace",
          fontSize: "14px",
          lineHeight: "1.5",
        }}
      >
        <strong style={{ color: colors.text }}>Input:</strong> nums = [2,7,11,15], target = 9<br />
        <strong style={{ color: colors.text }}>Output:</strong> [0,1]
        <br />
        <strong style={{ color: colors.text }}>Explanation:</strong> Because nums[0] + nums[1] == 9,
        we return [0, 1].
      </div>

      <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>Example 2:</h3>
      <div
        style={{
          background: colors.secondaryBg,
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "24px",
          border: `1px solid ${colors.border}`,
          fontFamily: "monospace",
          fontSize: "14px",
          lineHeight: "1.5",
        }}
      >
        <strong style={{ color: colors.text }}>Input:</strong> nums = [3,2,4], target = 6<br />
        <strong style={{ color: colors.text }}>Output:</strong> [1,2]
      </div>

      {/* 限制條件 (Constraints) */}
      <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>Constraints:</h3>
      <ul
        style={{
          margin: "0 0 20px 20px",
          padding: 0,
          lineHeight: "1.8",
          fontSize: "14px",
        }}
      >
        {/* 使用 <sup> 標籤來渲染數學次方 */}
        <li>
          <code style={{ background: codeBg, padding: "2px 6px", borderRadius: "4px" }}>
            2 &lt;= nums.length &lt;= 10<sup>4</sup>
          </code>
        </li>
        <li>
          <code style={{ background: codeBg, padding: "2px 6px", borderRadius: "4px" }}>
            -10<sup>9</sup> &lt;= nums[i] &lt;= 10<sup>9</sup>
          </code>
        </li>
        <li>
          <code style={{ background: codeBg, padding: "2px 6px", borderRadius: "4px" }}>
            -10<sup>9</sup> &lt;= target &lt;= 10<sup>9</sup>
          </code>
        </li>
        <li>
          <strong>Only one valid answer exists.</strong>
        </li>
      </ul>
    </div>
  );
}
