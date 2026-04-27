import globals from "globals";

const baseRules = {
  "no-const-assign": "error",
  "no-debugger": "warn",
  "no-dupe-keys": "error",
  "no-duplicate-case": "error",
  "no-obj-calls": "error",
  "no-redeclare": "error",
  "no-undef": "error",
  "no-unreachable": "error",
  "valid-typeof": "error",
};

export default [
  {
    ignores: [
      "frontend/slide_html_template/**",
      "frontend/svg/**",
      "frontend/css/**",
      "frontend/js/chatbot/services/embedded*.js",
      "frontend/js/chatbot/data/**/*.js",
      "data/**",
      "data_output/**",
      "output/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    files: ["frontend/js/chatbot/**/*.js", "tests/frontend/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    rules: baseRules,
  },
  {
    files: ["tests/e2e/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: baseRules,
  },
];
