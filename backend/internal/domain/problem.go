package domain

type Problem struct {
	ID          string `json:"id"         yaml:"id"`
	Title       string `json:"title"       yaml:"title"`
	Difficulty  string `json:"difficulty"  yaml:"difficulty"`
	Description string `json:"description" yaml:"description"`
}
