import * as path from 'path';
import Mocha from 'mocha';

export function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 10000
    });

    const testsRoot = path.resolve(__dirname, '..');

    return new Promise((c, e) => {
        try {
            // Manually add test files we know exist
            const testFiles = [
                path.resolve(testsRoot, 'suite/simple.test.js'),
                path.resolve(testsRoot, 'suite/basic-unit.test.js')
            ];

            // Add existing test files to the test suite
            testFiles.forEach(file => {
                try {
                    require.resolve(file);
                    mocha.addFile(file);
                } catch (err) {
                    console.log(`Test file not found: ${file}`);
                }
            });

            // Run the mocha test
            mocha.run((failures: number) => {
                if (failures > 0) {
                    e(new Error(`${failures} tests failed.`));
                } else {
                    c();
                }
            });
        } catch (err) {
            console.error(err);
            e(err);
        }
    });
}