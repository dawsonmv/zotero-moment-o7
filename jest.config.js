/** @type {import('jest').Config} */
module.exports = {
	preset: "ts-jest",
	testEnvironment: "jsdom",
	roots: ["<rootDir>/src", "<rootDir>/tests"],
	testMatch: [
		"**/__tests__/**/*.+(ts|tsx|js)",
		"**/?(*.)+(spec|test).+(ts|tsx|js)"
	],
	testPathIgnorePatterns: ["/node_modules/", "/build/", "/e2e/"],
	transform: {
		"^.+\\.(ts|tsx)$": ["ts-jest", {
			tsconfig: "tsconfig.test.json"
		}]
	},
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
		"^@services/(.*)$": "<rootDir>/src/services/$1",
		"^@utils/(.*)$": "<rootDir>/src/utils/$1",
		"^@memento/(.*)$": "<rootDir>/src/memento/$1",
		"^@preferences/(.*)$": "<rootDir>/src/preferences/$1",
		"^@monitoring/(.*)$": "<rootDir>/src/monitoring/$1"
	},
	modulePathIgnorePatterns: ["<rootDir>/build/"],
	setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
	collectCoverageFrom: [
		"src/**/*.{ts,tsx}",
		"!src/**/*.d.ts",
		"!src/**/index.ts",
		"!src/types/**",
		"!src/**/*.js",
		"!src/MomentO7.ts"
	],
	coverageThreshold: {
		global: {
			branches: 20,
			functions: 25,
			lines: 25,
			statements: 25
		}
	},
	coverageReporters: ["text", "text-summary", "lcov", "html"],
	coverageDirectory: "coverage",
	testTimeout: 10000,
	verbose: true
};