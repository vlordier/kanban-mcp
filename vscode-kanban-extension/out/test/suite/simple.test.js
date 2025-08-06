"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
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
//# sourceMappingURL=simple.test.js.map