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
const MCPClient_1 = require("../../mcp/MCPClient");
suite('MCPClient Basic Tests', () => {
    test('MCPClient should be instantiable', () => {
        const client = new MCPClient_1.MCPClient();
        assert.ok(client, 'MCPClient should be created');
        assert.strictEqual(typeof client.getWebServerUrl, 'function', 'Should have getWebServerUrl method');
        assert.strictEqual(typeof client.getMCPServerUrl, 'function', 'Should have getMCPServerUrl method');
        assert.strictEqual(typeof client.checkServerHealth, 'function', 'Should have checkServerHealth method');
    });
    test('MCPClient should return default URLs', () => {
        const client = new MCPClient_1.MCPClient();
        const webUrl = client.getWebServerUrl();
        const mcpUrl = client.getMCPServerUrl();
        assert.ok(webUrl.includes('http'), 'Web server URL should be HTTP URL');
        assert.ok(mcpUrl.includes('http'), 'MCP server URL should be HTTP URL');
        assert.strictEqual(typeof webUrl, 'string', 'Web URL should be string');
        assert.strictEqual(typeof mcpUrl, 'string', 'MCP URL should be string');
    });
});
//# sourceMappingURL=basic-unit.test.js.map