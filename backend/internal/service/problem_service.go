package service

import (
	"github.com/Dart147/SMC/backend/internal/domain"
	"github.com/Dart147/SMC/backend/internal/repository"
)

type ProblemService struct {
	repo *repository.ProblemRepo
}

func NewProblemService(repo *repository.ProblemRepo) *ProblemService {
	return &ProblemService{repo: repo}
}

// Create 處理建立題目的業務邏輯
func (s *ProblemService) Create(prob *domain.Problem) error {
	// 這裡可以加入一些業務邏輯驗證
	// 例如：檢查標題是否重複，或過濾不合法的字元

	// 呼叫 Repository 層將資料持久化
	return s.repo.Create(prob)
}

// List 取得所有題目列表
func (s *ProblemService) List() []domain.Problem {
	return s.repo.List()
}

// GetByID 根據 ID 查詢特定題目
func (s *ProblemService) GetByID(id string) (domain.Problem, bool) {
	return s.repo.GetByID(id)
}
