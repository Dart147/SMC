package service

import (
	"errors"
	"fmt"
	"time"
)

type ExamService struct {
	repo examRepo
}

func NewExamService(repo examRepo) *ExamService {
	return &ExamService{repo: repo}
}

// StartExam 正式啟動考試並計算截止時間
func (s *ExamService) StartExam(userID string) (int64, error) {
	// 呼叫 sqlc 產生的 StartExam，取得開始時間
	startedAt, err := s.repo.StartExam(userID)
	if err != nil {
		return 0, errors.New("failed to start exam")
	}

	// 考試時間：3 小時
	examDuration := 3 * time.Hour
	expiresAt := startedAt.Add(examDuration).Unix()

	return expiresAt, nil
}

// ReportWarning 紀錄違規並回傳最新次數
func (s *ExamService) ReportWarning(userID string) (int, error) {
	warningCount, err := s.repo.IncrementWarning(userID)
	if err != nil {
		return 0, errors.New("failed to update warning count")
	}

	// 🌟 核心防護：如果違規達到 3 次 (含) 以上，後端自動觸發「強制交卷」
	if warningCount >= 3 {
		// 直接呼叫你之前寫好的 EndExam 來寫入結束時間
		_, err := s.repo.EndExam(userID)
		if err != nil {
			// 如果寫入失敗，可以在後端印出 Log，但不影響前端收到次數
			fmt.Printf("[防弊系統] 帳號 %s 強制交卷失敗: %v\n", userID, err)
		} else {
			fmt.Printf("🚨 [防弊系統] 帳號 %s 違規滿 3 次，已自動強制交卷並鎖定。\n", userID)
		}
	}

	return warningCount, nil
}

// EndExam 結束考試
func (s *ExamService) EndExam(userID string) (time.Time, error) {
	return s.repo.EndExam(userID)
}
