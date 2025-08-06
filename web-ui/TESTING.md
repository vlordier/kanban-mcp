# Testing Guide

This project uses separate testing frameworks for different types of tests to avoid conflicts and ensure proper test isolation.

## 🧪 Test Types & Frameworks

### Unit Tests (Vitest)
- **Framework**: Vitest with jsdom
- **Location**: `src/**/*.{test,spec}.{ts,tsx}`
- **Config**: `vitest.config.ts`
- **Purpose**: Test individual components and functions in isolation

### Integration Tests (Vitest)
- **Framework**: Vitest with jsdom
- **Location**: `tests/integration/**/*.{test,spec}.{ts,tsx}`
- **Config**: `vitest.config.ts`
- **Purpose**: Test component interactions and API integrations

### End-to-End Tests (Playwright)
- **Framework**: Playwright
- **Location**: `tests/e2e/**/*.spec.ts`
- **Config**: `playwright.config.ts`
- **Purpose**: Test complete user workflows in real browser environments

## 🚀 Running Tests

### Unit Tests Only
```bash
npm run test:unit          # Run unit tests once
npm run test:unit:watch    # Run unit tests in watch mode
npm run test:ui            # Run with Vitest UI
```

### E2E Tests Only
```bash
npm run test:e2e           # Run E2E tests headless
npm run test:e2e:headed    # Run E2E tests with browser UI
npm run test:e2e:ui        # Run with Playwright UI
npm run test:e2e:debug     # Run in debug mode
npm run test:e2e:report    # View test report
```

### All Tests
```bash
npm run test:all           # Run both unit and E2E tests
npm run quality:full       # Run all quality checks including all tests
```

## 📁 Test Structure

```
web-ui/
├── src/
│   ├── components/
│   │   └── __tests__/           # Unit tests for components
│   │       ├── Button.test.tsx
│   │       └── Modal.test.tsx
│   └── utils/
│       └── helpers.test.ts      # Unit tests for utilities
├── tests/
│   ├── e2e/                     # Playwright E2E tests
│   │   ├── basic-functionality.spec.ts
│   │   ├── accessibility.spec.ts
│   │   └── visual-testing.spec.ts
│   ├── integration/             # Integration tests
│   │   └── api-integration.test.ts
│   └── unit/                    # Additional unit tests
│       └── complex-logic.test.ts
├── vitest.config.ts             # Unit test configuration
└── playwright.config.ts         # E2E test configuration
```

## ⚙️ Configuration Details

### Vitest Configuration
- **Environment**: jsdom (simulates browser environment)
- **Setup**: `src/test/setup.ts`
- **Coverage**: v8 provider with HTML/JSON reports
- **Exclusions**: E2E tests, node_modules, dist

### Playwright Configuration
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Test Directory**: `tests/e2e/`
- **Reports**: HTML reporter with screenshots/videos on failure
- **Dev Server**: Automatically starts Vite dev server

## 🔧 Test Isolation

The configurations are designed to prevent conflicts:

1. **Vitest** only runs files matching unit/integration patterns
2. **Playwright** only runs files in `tests/e2e/` directory
3. Different configuration files prevent framework conflicts
4. Separate npm scripts for each test type

## 🐛 Troubleshooting

### "test.describe is not defined" Error
This means Playwright tests are being picked up by Vitest. Check:
- File is in `tests/e2e/` directory
- Using `npm run test:e2e` instead of `npm run test`
- Vitest exclusion patterns in `vitest.config.ts`

### Tests Not Found
Check:
- File naming matches patterns (`*.test.ts`, `*.spec.ts`)
- Files are in correct directories
- Import statements use correct paths

### Port Conflicts
The dev server runs on port 3000. If you get port conflicts:
- Stop other applications using port 3000
- Or modify the port in `vite.config.ts` and `playwright.config.ts`

## 📊 Best Practices

1. **Unit Tests**: Fast, isolated, test single functions/components
2. **Integration Tests**: Test component interactions, API calls
3. **E2E Tests**: Test complete user journeys, critical paths
4. **Keep E2E tests minimal**: They're slower and more brittle
5. **Use proper assertions**: Specific expects, good error messages
6. **Mock external dependencies**: Keep tests reliable and fast