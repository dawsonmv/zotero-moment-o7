// @ts-check Let TS check this config file

import zotero from "@zotero-plugin/eslint-config";

export default zotero({
  overrides: [
    {
      files: ["**/*.ts"],
      rules: {
        // We disable this rule here because the template
        // contains some unused examples and variables
        "@typescript-eslint/no-unused-vars": "off",
      },
    },
    {
      files: ["tests/**/*.ts", "test/**/*.ts"],
      rules: {
        // Relax mocha rules for test files
        "mocha/no-setup-in-describe": "off",
        "mocha/max-top-level-suites": "off",
        "mocha/consistent-spacing-between-blocks": "off",
        // Allow empty catch blocks in tests
        "no-empty": "off",
      },
    },
  ],
});
