import * as assert from 'assert';
import { MCPClient } from '../../mcp/MCPClient';

suite('MCPClient Basic Tests', () => {
    test('MCPClient should be instantiable', () => {
        const client = new MCPClient();
        assert.ok(client, 'MCPClient should be created');
        assert.strictEqual(typeof client.getWebServerUrl, 'function', 'Should have getWebServerUrl method');
        assert.strictEqual(typeof client.getMCPServerUrl, 'function', 'Should have getMCPServerUrl method');
        assert.strictEqual(typeof client.checkServerHealth, 'function', 'Should have checkServerHealth method');
    });

    test('MCPClient should return default URLs', () => {
        const client = new MCPClient();
        const webUrl = client.getWebServerUrl();
        const mcpUrl = client.getMCPServerUrl();
        
        assert.ok(webUrl.includes('http'), 'Web server URL should be HTTP URL');
        assert.ok(mcpUrl.includes('http'), 'MCP server URL should be HTTP URL');
        assert.strictEqual(typeof webUrl, 'string', 'Web URL should be string');
        assert.strictEqual(typeof mcpUrl, 'string', 'MCP URL should be string');
    });
});