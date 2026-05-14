import { Problem } from "../../types/problem";

export const MOCK_PROBLEMS: Problem[] = [
  {
    id: "two-sum",
    title: "1. Two Sum",
    difficulty: "Easy",
    description: `
Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.

### Example 1:
**Input:** nums = [2,7,11,15], target = 9  
**Output:** [0,1]  
**Explanation:** Because \`nums[0] + nums[1] == 9\`, we return \`[0, 1]\`.

### Example 2:
**Input:** nums = [3,2,4], target = 6  
**Output:** [1,2]  

### Constraints:
* $2 \\le nums.length \\le 10^4$
* $-10^9 \\le nums[i] \\le 10^9$
* $-10^9 \\le target \\le 10^9$
* **Only one valid answer exists.**

**Follow-up:** Can you come up with an algorithm that is less than $O(n^2)$ time complexity?
    `,
  },
  {
    id: "knapsack",
    title: "2. 0/1 Knapsack Problem",
    difficulty: "Medium",
    description: `
Given weights $w_i$ and values $v_i$ of $n$ items, put these items in a knapsack of capacity $W$ to get the maximum total value in the knapsack.

You cannot break an item, either pick the complete item or don't pick it (0-1 property).

### Example 1:
**Input:** N = 3, W = 4, values = [1,2,3], weight = [4,5,1]  
**Output:** 3  
**Explanation:** There are two items which have weight less than or equal to 4. If we select the item with weight 1, we can get value 3.

### Constraints:
* $1 \\le N \\le 1000$
* $1 \\le W \\le 1000$
    `,
  },
];
