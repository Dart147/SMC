package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
)

type InterviewerHandler struct {
	db *sql.DB
}

func NewInterviewerHandler(db *sql.DB) *InterviewerHandler {
	return &InterviewerHandler{db: db}
}

func (h *InterviewerHandler) GetCandidates(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// 🌟 SQL 增加 s.total_test_cases 的抓取
	query := `
		SELECT 
			u.id, 
			u.username, 
			u.created_at,
			COALESCE(sub_data.total_score, 0) as overall_score,
			COALESCE(s.id::text, '') as sub_id,
			COALESCE(p.title, '未命名題目') as p_title,
			COALESCE(s.status, 'Ready') as sub_status,
			COALESCE(s.score, 0) as code_style_score,
			COALESCE(s.passed_test_cases, 0) as passed,
			COALESCE(s.total_test_cases, 0) as total
		FROM users u
		LEFT JOIN (
			SELECT user_id, SUM(score) as total_score 
			FROM submissions 
			GROUP BY user_id
		) sub_data ON u.id = sub_data.user_id
		LEFT JOIN submissions s ON u.id = s.user_id
		LEFT JOIN problems p ON s.problem_id = p.id
		WHERE u.role = 'candidate'
		ORDER BY s.created_at DESC`

	rows, err := h.db.Query(query)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	candidateMap := make(map[string]*map[string]interface{})
	var order []string

	for rows.Next() {
		var id, username, createdAt, subID, pTitle, subStatus string
		var overallScore, codeStyleScore, passed, total int
		rows.Scan(&id, &username, &createdAt, &overallScore, &subID, &pTitle, &subStatus, &codeStyleScore, &passed, &total)

		if _, ok := candidateMap[id]; !ok {
			candidateMap[id] = &map[string]interface{}{
				"id":           id,
				"username":     username,
				"createdAt":    createdAt,
				"warningCount": 0,
				"overallScore": overallScore,
				"submissions":  []map[string]interface{}{},
			}
			order = append(order, id)
		}

		if subID != "" {
			subs := (*candidateMap[id])["submissions"].([]map[string]interface{})
			(*candidateMap[id])["submissions"] = append(subs, map[string]interface{}{
				"id":              subID,
				"problemTitle":    pTitle,
				"status":          subStatus,
				"codeStyleScore":  codeStyleScore,
				// 🌟 這裡格式化成 "通過數/總數"
				"testCases":       fmt.Sprintf("%d/%d", passed, total),
			})
		}
	}

	var results []interface{}
	for _, id := range order {
		results = append(results, *candidateMap[id])
	}
	_ = json.NewEncoder(w).Encode(results)
}