const js = require("@eslint/js");

module.exports = [
	{
		ignores: [
			"node_modules/**",
			"*.xpi",
			"build/**",
			"dist/**",
			"cloudflare-worker/**",
			".DS_Store",
			"Thumbs.db",
			".vscode/**",
			".idea/**",
			".git/**",
			"*.md",
			"test/**",
			"tests/**",
			"spec/**",
			"scripts/**",
			"src/translators/**",
			"eslint.config.js"
		]
	},
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2021,
			sourceType: "script",
			globals: {
				Zotero: "readonly",
				Components: "readonly",
				Services: "readonly",
				ChromeUtils: "readonly",
				IOUtils: "readonly",
				PathUtils: "readonly",
				dump: "readonly",
				console: "readonly",
				window: "readonly",
				document: "readonly"
			}
		},
		rules: {
			"indent": ["error", "tab"],
			"linebreak-style": ["error", "unix"],
			"quotes": ["error", "double"],
			"semi": ["error", "always"],
			"no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
			"no-console": "warn",
			"no-debugger": "error",
			"no-alert": "warn",
			"eqeqeq": ["error", "always"],
			"curly": ["error", "all"],
			"brace-style": ["error", "1tbs"],
			"comma-dangle": ["error", "never"],
			"comma-spacing": ["error", { "before": false, "after": true }],
			"array-bracket-spacing": ["error", "never"],
			"object-curly-spacing": ["error", "always"],
			"key-spacing": ["error", { "beforeColon": false, "afterColon": true }],
			"keyword-spacing": ["error", { "before": true, "after": true }],
			"space-before-blocks": ["error", "always"],
			"space-before-function-paren": ["error", {
				"anonymous": "always",
				"named": "never",
				"asyncArrow": "always"
			}],
			"space-infix-ops": "error",
			"no-multiple-empty-lines": ["error", { "max": 2, "maxEOF": 1 }],
			"no-trailing-spaces": "error",
			"no-var": "error",
			"prefer-const": "error",
			"prefer-arrow-callback": "warn",
			"no-duplicate-imports": "error",
			"no-mixed-spaces-and-tabs": "error",
			"no-undef": "error",
			"no-redeclare": ["error", { "builtinGlobals": false }],
			"no-global-assign": "error"
		}
	},
	{
		files: ["src/translators/*.js"],
		rules: {
			"strict": "off"
		}
	},
	{
		files: ["jest.config.js", "*.config.js", "tests/**/*.js", "tests/**/*.ts"],
		languageOptions: {
			globals: {
				module: "readonly",
				require: "readonly",
				exports: "readonly",
				process: "readonly",
				__dirname: "readonly",
				__filename: "readonly",
				jest: "readonly",
				describe: "readonly",
				it: "readonly",
				test: "readonly",
				expect: "readonly",
				beforeEach: "readonly",
				afterEach: "readonly",
				beforeAll: "readonly",
				afterAll: "readonly"
			}
		}
	}
];