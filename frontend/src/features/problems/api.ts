export const fetchProblems = async () => {
  return new Promise((resolve) =>
    setTimeout(() => resolve([{ id: 1, title: "Two Sum", difficulty: "Easy" }]), 500),
  );
};
