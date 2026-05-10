export const login = async (_credentials: any) => {
  // ... 這裡可以寫模擬的登入邏輯
};

export const logout = async () => {
  return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 500));
};
