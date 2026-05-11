export const submitCode = async (data: { code: string; language: string }) => {
  return new Promise<{ output: string }>((resolve) =>
    setTimeout(
      () =>
        resolve({
          output: `Compiled and executed ${data.language} code successfully!\nOutput:\nHello World\n`,
        }),
      1000,
    ),
  );
};
