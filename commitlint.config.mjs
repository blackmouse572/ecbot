// Conventional Commits, checked by the commit-msg hook and on PR titles in CI.
// See .github/instructions/git.instructions.md.
export default {
  extends: ["@commitlint/config-conventional"],
  plugins: [
    {
      rules: {
        "no-co-author": ({ raw }) => [
          !/^co-authored-by:/im.test(raw ?? ""),
          "remove the Co-authored-by line",
        ],
      },
    },
  ],
  rules: {
    "header-max-length": [2, "always", 120],
    "subject-case": [0],
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
    "no-co-author": [2, "always"],
  },
};
