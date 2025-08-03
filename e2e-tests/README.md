# E2E Testing Configuration

## Chrome/Chromium Configuration

The E2E tests are designed to work across different environments by using flexible Chrome/Chromium configuration.

### Default Behavior
By default, tests use Puppeteer's bundled Chromium, which provides the best compatibility and doesn't require any system dependencies.

### Custom Chrome Installation
If you need to use a specific Chrome installation (e.g., for CI/CD or system compatibility), set the `CHROME_EXECUTABLE_PATH` environment variable:

#### macOS
```bash
export CHROME_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

#### Linux
```bash
export CHROME_EXECUTABLE_PATH="/usr/bin/google-chrome"
# or
export CHROME_EXECUTABLE_PATH="/usr/bin/chromium-browser"
```

#### Windows
```bash
set CHROME_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
# or PowerShell
$env:CHROME_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
```

#### Docker/CI Environments
```bash
export CHROME_EXECUTABLE_PATH="/usr/bin/chromium"
```

### CI/CD Configuration

#### GitHub Actions
```yaml
- name: Setup Chrome
  uses: browser-actions/setup-chrome@latest
  
- name: Run E2E Tests
  run: npm test
  env:
    CHROME_EXECUTABLE_PATH: chrome
```

#### Docker
```dockerfile
FROM node:18
RUN apt-get update && apt-get install -y chromium
ENV CHROME_EXECUTABLE_PATH=/usr/bin/chromium
```

### Test Files
The following test files support flexible Chrome configuration:
- `test-system-chrome.js`
- `comprehensive-visual-tests-final.js` 
- `visual-tests-simple.js`
- `comprehensive-visual-tests.js`

### Troubleshooting

**Issue**: Tests fail with "Chrome not found"
**Solution**: Either install Chrome/Chromium system-wide or remove the `CHROME_EXECUTABLE_PATH` environment variable to use bundled Chromium.

**Issue**: Sandbox errors in Linux
**Solution**: The tests include `--no-sandbox` flag for Linux compatibility. Ensure the Chrome executable has proper permissions.

**Issue**: Memory issues in CI
**Solution**: The tests include `--disable-dev-shm-usage` flag to prevent shared memory issues in containerized environments.

### Best Practices

1. **Local Development**: Use bundled Chromium (don't set `CHROME_EXECUTABLE_PATH`)
2. **CI/CD**: Set `CHROME_EXECUTABLE_PATH` to system-installed Chrome if needed
3. **Docker**: Install Chromium in the container and set the path
4. **Cross-platform**: Test without environment variable first, then set if needed