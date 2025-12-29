# Testing Guide

Comprehensive testing documentation for Zotero Moment-o7.

## Overview

The project uses a multi-layered testing strategy:

| Layer | Framework | Location | Purpose |
|-------|-----------|----------|---------|
| Unit | Jest | `tests/**/*.test.ts` | Test individual functions/classes |
| Integration | Jest | `tests/integration/*.test.ts` | Test component interactions |
| E2E | Playwright | `tests/e2e/*.spec.ts` | Test full workflows |

## Quick Start

```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run E2E with UI
npm run test:e2e:ui

# Watch mode for development
npm run test:watch
```

## Test Structure

```
tests/
├── setup.ts                    # Jest setup with Zotero mocks
├── utils/                      # Unit tests for utilities
│   ├── Cache.test.ts
│   ├── CircuitBreaker.test.ts
│   ├── HtmlUtils.test.ts
│   └── HttpClient.test.ts
├── services/                   # Unit tests for services
│   └── ServiceRegistry.test.ts
├── memento/                    # Unit tests for Memento protocol
│   └── MementoProtocol.test.ts
├── monitoring/                 # Unit tests for monitoring
│   ├── Logger.test.ts
│   └── Metrics.test.ts
├── integration/                # Integration tests
│   └── ArchiveCoordinator.integration.test.ts
└── e2e/                        # End-to-end tests
    └── smoke.spec.ts
```

## Writing Tests

### Unit Tests

Unit tests should test a single function or class in isolation.

```typescript
import { Cache } from '../../src/utils/Cache';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache({ maxSize: 10 });
  });

  afterEach(() => {
    cache.destroy();
  });

  it('should store and retrieve values', () => {
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });
});
```

### Integration Tests

Integration tests verify that components work together correctly.

```typescript
describe('ArchiveCoordinator Integration', () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    registry = ServiceRegistry.getInstance();
    registry.clear();
    registry.init();
  });

  it('should coordinate multiple services', async () => {
    // Test multiple components working together
  });
});
```

### E2E Tests

E2E tests verify complete workflows using Playwright.

```typescript
import { test, expect } from '@playwright/test';

test('should archive URL successfully', async ({ request }) => {
  const response = await request.get('https://archive.org/wayback/available?url=example.com');
  expect(response.ok()).toBeTruthy();
});
```

## Mocking

### Zotero Global Mock

The `tests/setup.ts` file provides a comprehensive Zotero mock:

```typescript
(global as any).Zotero = {
  debug: jest.fn(),
  HTTP: { request: jest.fn() },
  Items: { get: jest.fn(), getAsync: jest.fn() },
  Prefs: { get: jest.fn(), set: jest.fn() },
  // ... more mocks
};
```

### Service Mocks

Create mock services for testing:

```typescript
const createMockService = (id: string, options = {}): ArchiveService => ({
  name: `Mock ${id}`,
  id,
  isAvailable: jest.fn().mockResolvedValue(true),
  archive: jest.fn().mockResolvedValue([{ success: true }])
});
```

### HTTP Mocks

Mock HTTP requests for unit tests:

```typescript
beforeEach(() => {
  (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
    status: 200,
    responseText: '{"success": true}'
  });
});
```

## Coverage

### Thresholds

Current coverage thresholds (enforced in CI):

| Metric | Threshold |
|--------|-----------|
| Branches | 20% |
| Functions | 25% |
| Lines | 25% |
| Statements | 25% |

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html
```

### Coverage Exclusions

Excluded from coverage (configured in `jest.config.js`):
- Type declaration files (`*.d.ts`)
- Index files (`index.ts`)
- Type definitions (`src/types/**`)
- Legacy JavaScript files (`*.js`)
- Main entry point (`MomentO7.ts`)

## CI/CD Integration

Tests run automatically on:
- Push to `master`, `main`, `develop`
- Pull requests to `master`, `main`

The CI workflow (`.github/workflows/test.yml`):
1. Runs on Node.js 18.x and 20.x
2. Executes linting, type checking, and tests
3. Uploads coverage to Codecov
4. Builds the project

## Test Patterns

### Testing Singletons

```typescript
describe('Singleton', () => {
  let instance: Singleton;

  beforeEach(() => {
    instance = Singleton.getInstance();
    instance.reset(); // Clear state
  });

  it('returns same instance', () => {
    expect(Singleton.getInstance()).toBe(instance);
  });
});
```

### Testing Async Operations

```typescript
it('should handle async operations', async () => {
  const result = await asyncCache.get('key', async () => {
    return await fetchData();
  });
  expect(result).toBeDefined();
});
```

### Testing Error Handling

```typescript
it('should handle errors gracefully', async () => {
  const errorService = createMockService('error');
  (errorService.isAvailable as jest.Mock).mockRejectedValue(new Error('Network error'));

  await expect(registry.getAvailable()).resolves.toHaveLength(0);
});
```

### Testing Time-Dependent Code

```typescript
it('should expire entries after TTL', async () => {
  cache.set('key', 'value', 100); // 100ms TTL
  expect(cache.get('key')).toBe('value');

  await new Promise(resolve => setTimeout(resolve, 150));

  expect(cache.get('key')).toBeUndefined();
});
```

## Debugging Tests

### Run Single Test File

```bash
npm test -- tests/utils/Cache.test.ts
```

### Run Single Test

```bash
npm test -- --testNamePattern="should store and retrieve"
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Current File",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["${fileBasename}", "--config", "jest.config.js"],
  "console": "integratedTerminal"
}
```

### Playwright Debug

```bash
npm run test:e2e -- --debug
```

## Best Practices

1. **Test behavior, not implementation** - Focus on what the code does, not how
2. **Use descriptive test names** - Names should explain what's being tested
3. **One assertion per test** - When possible, keep tests focused
4. **Clean up after tests** - Use `afterEach` to reset state
5. **Mock external dependencies** - Don't hit real APIs in unit tests
6. **Keep tests fast** - Unit tests should run in milliseconds
7. **Test edge cases** - Empty arrays, null values, errors
8. **Avoid test interdependence** - Tests should run in any order

## Troubleshooting

### Tests Timeout

```bash
# Increase timeout for slow tests
npm test -- --testTimeout=30000
```

### Memory Issues

```bash
# Run tests serially
npm test -- --runInBand
```

### Coverage Not Generated

Ensure you're using the coverage command:
```bash
npm run test:coverage
```

### E2E Tests Fail

Install Playwright browsers:
```bash
npx playwright install
```
