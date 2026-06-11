package service

import (
	"errors"
	"time"

	"go.uber.org/zap"
)

type ExamService struct {
	repo   examRepo
	logger *zap.Logger
}

func NewExamService(repo examRepo, logger *zap.Logger) *ExamService {
	return &ExamService{repo: repo, logger: logger}
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
			// 寫入失敗只記錄 Log，不影響前端收到次數
			s.logger.Error("anti-cheat force-submit failed", zap.String("user_id", userID), zap.Error(err))
		} else {
			s.logger.Warn("anti-cheat auto-submitted exam after 3 violations", zap.String("user_id", userID))
		}
	}

	return warningCount, nil
}

// EndExam 結束考試
func (s *ExamService) EndExam(userID string) (time.Time, error) {
	return s.repo.EndExam(userID)
}
