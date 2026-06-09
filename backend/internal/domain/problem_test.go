package domain

import (
	"testing"
)

func TestForDisplay_HidesHiddenTestCases(t *testing.T) {
	p := Problem{
		ID:    1,
		Title: "Two Sum",
		TestCases: []TestCase{
			{Input: "2 7\n9\n", ExpectedOutput: "0 1\n", IsHidden: false},
			{Input: "3 2\n5\n", ExpectedOutput: "0 1\n", IsHidden: true},
		},
	}
	d := p.ForDisplay()
	if len(d.TestCases) != 1 {
		t.Fatalf("ForDisplay: got %d test cases, want 1", len(d.TestCases))
	}
	if d.TestCases[0].IsHidden {
		t.Error("ForDisplay: visible test case should have IsHidden=false")
	}
	if d.TestCases[0].Input != "2 7\n9\n" {
		t.Errorf("ForDisplay: wrong test case preserved, got input %q", d.TestCases[0].Input)
	}
}

func TestForDisplay_AllHidden(t *testing.T) {
	p := Problem{
		TestCases: []TestCase{
			{Input: "a", IsHidden: true},
			{Input: "b", IsHidden: true},
		},
	}
	d := p.ForDisplay()
	if len(d.TestCases) != 0 {
		t.Errorf("ForDisplay: expected 0 visible test cases, got %d", len(d.TestCases))
	}
}

func TestForDisplay_NoneHidden(t *testing.T) {
	p := Problem{
		TestCases: []TestCase{
			{Input: "x", IsHidden: false},
			{Input: "y", IsHidden: false},
		},
	}
	d := p.ForDisplay()
	if len(d.TestCases) != 2 {
		t.Errorf("ForDisplay: expected 2 test cases, got %d", len(d.TestCases))
	}
}

func TestForDisplay_PreservesFields(t *testing.T) {
	p := Problem{ID: 42, Title: "Test Problem", Difficulty: "Easy", Description: "desc"}
	d := p.ForDisplay()
	if d.ID != 42 || d.Title != "Test Problem" || d.Difficulty != "Easy" || d.Description != "desc" {
		t.Error("ForDisplay: should preserve ID, Title, Difficulty, Description")
	}
}

func TestForDisplay_NoTestCases(t *testing.T) {
	p := Problem{ID: 2, Title: "Empty"}
	d := p.ForDisplay()
	if d.TestCases != nil {
		t.Error("ForDisplay: TestCases should be nil when original has none")
	}
}

func TestFirstSample_ReturnsFirstVisible(t *testing.T) {
	p := Problem{
		TestCases: []TestCase{
			{Input: "a", IsHidden: true},
			{Input: "b", IsHidden: false},
			{Input: "c", IsHidden: false},
		},
	}
	tc, ok := p.FirstSample()
	if !ok {
		t.Fatal("FirstSample: expected to find a sample")
	}
	if tc.Input != "b" {
		t.Errorf("FirstSample: got %q, want %q", tc.Input, "b")
	}
}

func TestFirstSample_AllHidden(t *testing.T) {
	p := Problem{
		TestCases: []TestCase{
			{Input: "a", IsHidden: true},
		},
	}
	_, ok := p.FirstSample()
	if ok {
		t.Error("FirstSample: expected false when all test cases are hidden")
	}
}

func TestFirstSample_Empty(t *testing.T) {
	p := Problem{}
	_, ok := p.FirstSample()
	if ok {
		t.Error("FirstSample: expected false for problem with no test cases")
	}
}
