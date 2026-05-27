package domain

type TestCase struct {
	Input string `json:"input"`
	// ⚠️ 這裡要改成 expected_output，因為你前端是用這個 key 送出的
	ExpectedOutput string `json:"expected_output"`
}

type Problem struct {
	// ⚠️ 建議把 ID tag 改成 int 並讓資料庫生成，
	// 或者乾脆在前端送出時把 id 拿掉。
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Difficulty  string `json:"difficulty"`
	Description string `json:"description"`
	// ⚠️ 這裡要改成 testCases (注意大小寫)，對應前端的 problemData
	TestCases []TestCase `json:"testCases"`
}
