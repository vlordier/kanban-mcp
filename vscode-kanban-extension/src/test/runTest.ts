import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');

        // The path to test runner
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        // Download VS Code, unzip it and run the integration test
        await runTests({ 
            extensionDevelopmentPath, 
            extensionTestsPath,
            launchArgs: [
                '--disable-extensions', // Disable other extensions for clean test environment
                '--disable-updates',    // Disable update checks during testing
                '--skip-welcome',       // Skip welcome screen
                '--user-data-dir=/tmp/vscode-test-kanban', // Use shorter path to avoid IPC handle warning
                '--log=off',           // Reduce log verbosity
                '--skip-release-notes', // Skip release notes
                '--disable-workspace-trust', // Disable workspace trust for tests
                '--no-sandbox'         // Disable sandbox for CI/testing environments
            ]
        });
    } catch (err) {
        console.error('Failed to run tests', err);
        process.exit(1);
    }
}

main();