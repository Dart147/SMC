# 資料庫 Schema 詳細規格說明 (Schema Documentation)

這份文件用於向後端工程師與組員詳細說明目前四張核心資料表 (`users`, `questions`, `test_cases`, `submissions`) 的欄位與型態設計。這對應了第一期的需求，並預留了未來擴充的彈性。

## 1. `users` (使用者表)
**功能：** 儲存面試者與面試主管的帳號資訊。也是系統 Auth API 認證登入的依據。

*   **`id`** (`SERIAL PRIMARY KEY`): 系統自動遞增的流水號，作為使用者的唯一識別碼 (User ID)。
*   **`username`** (`VARCHAR(50) UNIQUE NOT NULL`): 登入帳號。限制最長 50 字元，`UNIQUE` 代表系統內不可有重複帳號，`NOT NULL` 代表必填。
*   **`password_hash`** (`VARCHAR(255) NOT NULL`): 儲存加密後 (Hash) 的密碼，絕對不要存明文！長度設為 255 以適應各種 Hash 演算法 (如 bcrypt)。
*   **`email`** (`VARCHAR(100) UNIQUE`): 使用者信箱，也是不可重複。這在面試邀請系統中很重要。
*   **`role`** (`VARCHAR(20) DEFAULT 'candidate'`): 辨識權限。預設為 `candidate` (面試者)，也可以設定為 `admin` (面試主管)。我們用這個欄位來控制誰能看到後台。
*   **`created_at`** (`TIMESTAMP DEFAULT CURRENT_TIMESTAMP`): 帳號建立時間。資料庫會自動帶入當前時間，後端不需給值。

## 2. `questions` (面試題目表)
**功能：** 面試主管建立的考試題目都在這裡。

*   **`id`** (`SERIAL PRIMARY KEY`): 題目的唯一識別號 (Question ID)。
*   **`title`** (`VARCHAR(100) NOT NULL`): 題目名稱 (例如 "Two Sum")。
*   **`description`** (`TEXT NOT NULL`): 題目的詳細敘述。因為可能會有很多 Markdown 語法或很長，所以使用沒有長度上限的 `TEXT`。
*   **`time_limit_ms`** (`INTEGER NOT NULL DEFAULT 1000`): **時間限制 (Time Limit)**。單位為**毫秒 (ms)**，預設為 1000ms (1秒)。這會拿來判定是否 TLE。
*   **`memory_limit_kb`** (`INTEGER NOT NULL DEFAULT 65536`): **記憶體限制 (Memory Limit)**。單位為 **KB**，預設為 65536 KB (64MB)。拿來判定是否 MLE。
*   **`difficulty`** (`VARCHAR(20)`): 題目難度 (例如 'Easy', 'Medium', 'Hard')。
*   **`created_at`** (`TIMESTAMP`): 題目建立時間。自動產生。

## 3. `test_cases` (測資表)
**功能：** 儲存每道題目的測試資料。一題會對應到多筆測資 (一對多關係)。

*   **`id`** (`SERIAL PRIMARY KEY`): 測資的唯一流水號。
*   **`question_id`** (`INTEGER REFERENCES questions(id) ON DELETE CASCADE`): **(Foreign Key)** 紀錄這筆測資是屬於哪一道題目的。`ON DELETE CASCADE` 代表如果題目被刪除，這題的所有測資也會跟著自動被刪除，保持資料乾淨。
*   **`input_data`** (`TEXT NOT NULL`): 面試主管設定的輸入資料 (例如: `[2,7,11,15]\n9`)。
*   **`expected_output`** (`TEXT NOT NULL`): 這筆輸入預期要得到的正確輸出 (例如: `[0,1]`)。
*   **`is_hidden`** (`BOOLEAN DEFAULT true`): 布林值 (True/False)。用來控制這筆測資是不是「隱藏測資」。面試者通常只能看到公開測資，隱藏的只會在後台批改時使用。

## 4. `submissions` (提交成績表)
**功能：** 系統最核心的一張表！紀錄「誰」對「哪一題」寫了「什麼扣」，最後「得到什麼結果」。

*   **`id`** (`SERIAL PRIMARY KEY`): 提交紀錄的流水號。
*   **`user_id`** (`INTEGER REFERENCES users(id) ON DELETE CASCADE`): **(Foreign Key)** 是哪位面試者交的考卷。
*   **`question_id`** (`INTEGER REFERENCES questions(id) ON DELETE CASCADE`): **(Foreign Key)** 這是哪一題的考卷。
*   **`code`** (`TEXT NOT NULL`): 面試者寫的原始程式碼。
*   **`language`** (`VARCHAR(20) NOT NULL`): 面試者使用的程式語言 (例如: `python`, `golang`, `cpp`)。
*   **`status`** (`VARCHAR(20) DEFAULT 'Pending'`): 這份考卷目前的**批改狀態**。一開始存入會是 `Pending`，等 Judge Worker 改完後，會被 Update 成 `AC`(全對), `WA`(答案錯), `TLE`(超時), `MLE`(記憶體爆掉), `RE`(執行期錯誤), `CE`(編譯錯誤) 等。
*   **`passed_test_cases`** (`INTEGER DEFAULT 0`): 面試者通過了幾個測資。
*   **`total_test_cases`** (`INTEGER DEFAULT 0`): 這題總共有幾個測資。
*   **`execution_time_ms`** (`INTEGER`): 程式實際跑完花掉的時間 (毫秒)。可供面試官參考效能。
*   **`memory_used_kb`** (`INTEGER`): 程式實際消耗的記憶體 (KB)。
*   **`score`** (`INTEGER DEFAULT 0`): 綜合得分 (例如: 100分)。
*   **`coding_style_score`** (`INTEGER`): 系統 (Lint) 給出的 Coding Style 分數。符合你們需求中的 `Lint / coding style reviewer 面試主管會在意面試者的 coding style`。
*   **`log_output`** (`TEXT`): Worker 執行時產生的詳細 log 或編譯錯誤訊息。這欄位未來在第三期架構時可能會移去 AWS S3。
*   **`created_at`** (`TIMESTAMP`): 提交時間。

---

*以上 Schema 已完全涵蓋作業第一期之所有 Requirements，並預留未來擴充。*