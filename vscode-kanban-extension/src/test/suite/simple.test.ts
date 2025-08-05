import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Basic Extension Tests', () => {
    test('VSCode API should be available', () => {
        assert.ok(vscode, 'VSCode API should be available');
        assert.ok(vscode.window, 'VSCode window API should be available');
        assert.ok(vscode.commands, 'VSCode commands API should be available');
        assert.ok(vscode.workspace, 'VSCode workspace API should be available');
    });

    test('Extension should define expected exports', () => {
        const extension = require('../../extension');
        assert.ok(extension.activate, 'Extension should export activate function');
        assert.ok(extension.deactivate, 'Extension should export deactivate function');
        assert.strictEqual(typeof extension.activate, 'function', 'activate should be a function');
        assert.strictEqual(typeof extension.deactivate, 'function', 'deactivate should be a function');
    });
});