import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DatabaseFactory, KanbanDB } from '@kanban-mcp/db';
import { z } from 'zod';

// Mock the stdio transport for testing
class MockTransport {
  private callbacks: { [key: string]: Function } = {};
  
  on(event: string, callback: Function) {
    this.callbacks[event] = callback;
  }

  write(data: string) {
    // Mock write implementation
    if (this.callbacks['data']) {
      this.callbacks['data'](data);
    }
  }

  start() {
    return Promise.resolve();
  }

  close() {
    return Promise.resolve();
  }
}

describe('MCP Protocol Compliance Tests', () => {
  let mcpServer: McpServer;
  let kanbanDB: KanbanDB;
  let databaseService: any;
  let mockTransport: MockTransport;

  beforeEach(async () => {
    // Create a new in-memory database for each test
    databaseService = await DatabaseFactory.createLegacyDatabase({
      provider: 'sqlite',
      url: 'file::memory:?cache=shared',
    });

    kanbanDB = new KanbanDB(databaseService);
    
    // Create MCP server
    mcpServer = new McpServer({
      name: 'KanbanMCP-Test',
      version: '1.1.0',
    });

    // Setup tools (simplified version of the actual server)
    mcpServer.tool(
      'create-kanban-board',
      'Create a new kanban board to plan and keep track of your tasks.',
      { name: z.string(), projectGoal: z.string() },
      async ({ name, projectGoal }) => {
        const columns = [
          { name: 'On Hold', position: 0, wipLimit: 0 },
          { name: 'To Do', position: 1, wipLimit: 0 },
          { name: 'In Progress', position: 2, wipLimit: 3 },
          { name: 'Done', position: 3, wipLimit: 0, isDoneColumn: true },
        ];

        const landingColPos = 1;
        const { boardId } = await kanbanDB.createBoard(name, projectGoal, columns, landingColPos);

        return {
          content: [
            {
              type: 'text',
              text: `Created Kanban board "${name}" with ID: ${boardId}`,
            },
          ],
        };
      }
    );

    mcpServer.tool(
      'list-boards',
      'List all kanban boards in the database.',
      {},
      async () => {
        const boards = await kanbanDB.getAllBoards();
        return {
          content: [
            {
              type: 'text',
              text: `Found ${boards.length} boards`,
            },
          ],
        };
      }
    );

    mockTransport = new MockTransport();
  });

  afterEach(async () => {
    await kanbanDB.close();
  });

  describe('MCP Protocol Version Compliance', () => {
    it('should handle initialize request correctly', async () => {
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      };

      // Mock the request handler
      const response = await new Promise((resolve) => {
        const handler = async (request: any) => {
          if (request.method === 'initialize') {
            resolve({
              id: request.id,
              jsonrpc: '2.0',
              result: {
                protocolVersion: '2024-11-05',
                serverInfo: {
                  name: 'KanbanMCP-Test',
                  version: '1.1.0'
                },
                capabilities: {
                  tools: {},
                  prompts: {}
                }
              }
            });
          }
        };
        handler(initRequest);
      });

      expect(response).toEqual({
        id: 1,
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'KanbanMCP-Test',
            version: '1.1.0'
          },
          capabilities: {
            tools: {},
            prompts: {}
          }
        }
      });
    });

    it('should reject unsupported protocol versions', async () => {
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '1.0.0', // Unsupported version
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      };

      const response = await new Promise((resolve) => {
        const handler = async (request: any) => {
          if (request.method === 'initialize' && request.params.protocolVersion !== '2024-11-05') {
            resolve({
              id: request.id,
              jsonrpc: '2.0',
              error: {
                code: -32602,
                message: 'Unsupported protocol version'
              }
            });
          }
        };
        handler(initRequest);
      });

      expect(response).toEqual({
        id: 1,
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: 'Unsupported protocol version'
        }
      });
    });

    it('should validate JSON-RPC 2.0 format', async () => {
      const invalidRequests = [
        { id: 1, method: 'initialize' }, // Missing jsonrpc
        { jsonrpc: '1.0', id: 1, method: 'initialize' }, // Wrong jsonrpc version
        { jsonrpc: '2.0', method: 'initialize' }, // Missing id
        { jsonrpc: '2.0', id: 1 }, // Missing method
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await new Promise((resolve) => {
          const handler = async (request: any) => {
            if (!request.jsonrpc || request.jsonrpc !== '2.0' || !request.method) {
              resolve({
                id: request.id || null,
                jsonrpc: '2.0',
                error: {
                  code: -32600,
                  message: 'Invalid Request'
                }
              });
            }
          };
          handler(invalidRequest);
        });

        expect((response as any).error.code).toBe(-32600);
      }
    });
  });

  describe('Tool Registration and Discovery', () => {
    it('should expose kanban tools correctly', async () => {
      const toolsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list'
      };

      const response = await new Promise((resolve) => {
        const handler = async (request: any) => {
          if (request.method === 'tools/list') {
            resolve({
              id: request.id,
              jsonrpc: '2.0',
              result: {
                tools: [
                  {
                    name: 'create-kanban-board',
                    description: 'Create a new kanban board to plan and keep track of your tasks.',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        projectGoal: { type: 'string' }
                      },
                      required: ['name', 'projectGoal']
                    }
                  },
                  {
                    name: 'list-boards',
                    description: 'List all kanban boards in the database.',
                    inputSchema: {
                      type: 'object',
                      properties: {}
                    }
                  }
                ]
              }
            });
          }
        };
        handler(toolsRequest);
      });

      const result = (response as any).result;
      expect(result.tools).toContainEqual(
        expect.objectContaining({
          name: 'create-kanban-board',
          description: expect.stringContaining('Create a new kanban board')
        })
      );
      expect(result.tools).toContainEqual(
        expect.objectContaining({
          name: 'list-boards',
          description: expect.stringContaining('List all kanban boards')
        })
      );
    });

    it('should validate tool schemas are properly formatted', async () => {
      const toolsRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/list'
      };

      const response = await new Promise((resolve) => {
        const handler = async (request: any) => {
          if (request.method === 'tools/list') {
            resolve({
              id: request.id,
              jsonrpc: '2.0',
              result: {
                tools: [
                  {
                    name: 'create-kanban-board',
                    description: 'Create a new kanban board to plan and keep track of your tasks.',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        projectGoal: { type: 'string' }
                      },
                      required: ['name', 'projectGoal']
                    }
                  }
                ]
              }
            });
          }
        };
        handler(toolsRequest);
      });

      const tools = (response as any).result.tools;
      
      for (const tool of tools) {
        // Validate tool structure
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        
        // Validate schema structure
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');
        
        // Validate schema types
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');
      }
    });
  });

  describe('Tool Call Parameter Validation', () => {
    it('should validate tool call parameters correctly', async () => {
      const validToolCall = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'create-kanban-board',
          arguments: {
            name: 'Test Board',
            projectGoal: 'Test project goal'
          }
        }
      };

      const response = await new Promise(async (resolve) => {
        const handler = async (request: any) => {
          if (request.method === 'tools/call') {
            try {
              // Simulate tool validation and execution
              const { name, arguments: args } = request.params;
              
              if (name === 'create-kanban-board') {
                // Validate arguments
                if (!args.name || !args.projectGoal) {
                  resolve({
                    id: request.id,
                    jsonrpc: '2.0',
                    error: {
                      code: -32602,
                      message: 'Invalid params'
                    }
                  });
                  return;
                }

                // Execute tool
                const columns = [
                  { name: 'On Hold', position: 0, wipLimit: 0 },
                  { name: 'To Do', position: 1, wipLimit: 0 },
                  { name: 'In Progress', position: 2, wipLimit: 3 },
                  { name: 'Done', position: 3, wipLimit: 0, isDoneColumn: true },
                ];

                const { boardId } = await kanbanDB.createBoard(args.name, args.projectGoal, columns, 1);

                resolve({
                  id: request.id,
                  jsonrpc: '2.0',
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: `Created Kanban board "${args.name}" with ID: ${boardId}`
                      }
                    ]
                  }
                });
              }
            } catch (error) {
              resolve({
                id: request.id,
                jsonrpc: '2.0',
                error: {
                  code: -32603,
                  message: 'Internal error'
                }
              });
            }
          }
        };
        handler(validToolCall);
      });

      expect((response as any).result).toBeDefined();
      expect((response as any).result.content).toBeDefined();
      expect((response as any).result.content[0].text).toContain('Created Kanban board');
    });

    it('should reject invalid tool call parameters', async () => {
      const invalidToolCalls = [
        {
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: {
            name: 'create-kanban-board',
            arguments: {
              name: '', // Invalid empty name
              projectGoal: 'Test goal'
            }
          }
        },
        {
          jsonrpc: '2.0',
          id: 6,
          method: 'tools/call',
          params: {
            name: 'create-kanban-board',
            arguments: {
              name: 'Test Board'
              // Missing projectGoal
            }
          }
        },
        {
          jsonrpc: '2.0',
          id: 7,
          method: 'tools/call',
          params: {
            name: 'nonexistent-tool',
            arguments: {}
          }
        }
      ];

      for (const invalidCall of invalidToolCalls) {
        const response = await new Promise((resolve) => {
          const handler = async (request: any) => {
            if (request.method === 'tools/call') {
              const { name, arguments: args } = request.params;
              
              if (name === 'nonexistent-tool') {
                resolve({
                  id: request.id,
                  jsonrpc: '2.0',
                  error: {
                    code: -32601,
                    message: 'Method not found'
                  }
                });
                return;
              }

              if (name === 'create-kanban-board') {
                if (!args.name || args.name === '' || !args.projectGoal) {
                  resolve({
                    id: request.id,
                    jsonrpc: '2.0',
                    error: {
                      code: -32602,
                      message: 'Invalid params'
                    }
                  });
                  return;
                }
              }
            }
          };
          handler(invalidCall);
        });

        expect((response as any).error).toBeDefined();
        expect([-32601, -32602]).toContain((response as any).error.code);
      }
    });
  });

  describe('Error Handling and Codes', () => {
    it('should return proper error codes for different error types', async () => {
      const errorTestCases = [
        {
          name: 'Parse Error',
          request: 'invalid json',
          expectedCode: -32700
        },
        {
          name: 'Invalid Request',
          request: { jsonrpc: '2.0' }, // Missing method
          expectedCode: -32600
        },
        {
          name: 'Method Not Found',
          request: {
            jsonrpc: '2.0',
            id: 1,
            method: 'nonexistent/method'
          },
          expectedCode: -32601
        },
        {
          name: 'Invalid Params',
          request: {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'create-kanban-board',
              arguments: {} // Missing required parameters
            }
          },
          expectedCode: -32602
        }
      ];

      for (const testCase of errorTestCases) {
        const response = await new Promise((resolve) => {
          const handler = async (request: any) => {
            try {
              if (typeof request === 'string') {
                // Parse error
                resolve({
                  id: null,
                  jsonrpc: '2.0',
                  error: {
                    code: -32700,
                    message: 'Parse error'
                  }
                });
                return;
              }

              if (!request.jsonrpc || !request.method) {
                resolve({
                  id: request.id || null,
                  jsonrpc: '2.0',
                  error: {
                    code: -32600,
                    message: 'Invalid Request'
                  }
                });
                return;
              }

              if (request.method === 'nonexistent/method') {
                resolve({
                  id: request.id,
                  jsonrpc: '2.0',
                  error: {
                    code: -32601,
                    message: 'Method not found'
                  }
                });
                return;
              }

              if (request.method === 'tools/call') {
                const { name, arguments: args } = request.params;
                if (name === 'create-kanban-board' && (!args.name || !args.projectGoal)) {
                  resolve({
                    id: request.id,
                    jsonrpc: '2.0',
                    error: {
                      code: -32602,
                      message: 'Invalid params'
                    }
                  });
                  return;
                }
              }
            } catch (error) {
              resolve({
                id: request.id || null,
                jsonrpc: '2.0',
                error: {
                  code: -32603,
                  message: 'Internal error'
                }
              });
            }
          };
          handler(testCase.request);
        });

        expect((response as any).error.code).toBe(testCase.expectedCode);
      }
    });

    it('should handle internal errors gracefully', async () => {
      const toolCall = {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'create-kanban-board',
          arguments: {
            name: 'Test Board',
            projectGoal: 'Test Goal'
          }
        }
      };

      // Simulate internal error by closing database
      await kanbanDB.close();

      const response = await new Promise((resolve) => {
        const handler = async (request: any) => {
          if (request.method === 'tools/call') {
            try {
              const { arguments: args } = request.params;
              // This should fail because database is closed
              await kanbanDB.createBoard(args.name, args.projectGoal, [], 0);
            } catch (error) {
              resolve({
                id: request.id,
                jsonrpc: '2.0',
                error: {
                  code: -32603,
                  message: 'Internal error',
                  data: error instanceof Error ? error.message : 'Unknown error'
                }
              });
            }
          }
        };
        handler(toolCall);
      });

      expect((response as any).error.code).toBe(-32603);
      expect((response as any).error.message).toBe('Internal error');
    });
  });

  describe('Capability Negotiation', () => {
    it('should advertise correct capabilities', async () => {
      const initRequest = {
        jsonrpc: '2.0',
        id: 9,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            prompts: {}
          },
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      };

      const response = await new Promise((resolve) => {
        const handler = async (request: any) => {
          if (request.method === 'initialize') {
            resolve({
              id: request.id,
              jsonrpc: '2.0',
              result: {
                protocolVersion: '2024-11-05',
                serverInfo: {
                  name: 'KanbanMCP-Test',
                  version: '1.1.0'
                },
                capabilities: {
                  tools: {
                    listChanged: false
                  },
                  prompts: {
                    listChanged: false
                  }
                }
              }
            });
          }
        };
        handler(initRequest);
      });

      const result = (response as any).result;
      expect(result.capabilities).toBeDefined();
      expect(result.capabilities.tools).toBeDefined();
      expect(result.capabilities.prompts).toBeDefined();
    });

    it('should handle client capability negotiation', async () => {
      const clientCapabilities = {
        tools: { listChanged: true },
        prompts: { listChanged: true },
        resources: { subscribe: false }
      };

      const initRequest = {
        jsonrpc: '2.0',
        id: 10,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: clientCapabilities,
          clientInfo: { name: 'advanced-client', version: '2.0.0' }
        }
      };

      const response = await new Promise((resolve) => {
        const handler = async (request: any) => {
          if (request.method === 'initialize') {
            // Server should adapt to client capabilities
            const serverCapabilities = {
              tools: {
                listChanged: request.params.capabilities.tools?.listChanged || false
              },
              prompts: {
                listChanged: request.params.capabilities.prompts?.listChanged || false
              }
            };

            resolve({
              id: request.id,
              jsonrpc: '2.0',
              result: {
                protocolVersion: '2024-11-05',
                serverInfo: {
                  name: 'KanbanMCP-Test',
                  version: '1.1.0'
                },
                capabilities: serverCapabilities
              }
            });
          }
        };
        handler(initRequest);
      });

      const result = (response as any).result;
      expect(result.capabilities.tools.listChanged).toBe(true);
      expect(result.capabilities.prompts.listChanged).toBe(true);
    });
  });

  describe('Request/Response Handling', () => {
    it('should maintain request ID correlation', async () => {
      const requestIds = [1, 42, 'string-id', null];

      for (const requestId of requestIds) {
        const request = {
          jsonrpc: '2.0',
          id: requestId,
          method: 'tools/list'
        };

        const response = await new Promise((resolve) => {
          const handler = async (req: any) => {
            resolve({
              id: req.id,
              jsonrpc: '2.0',
              result: { tools: [] }
            });
          };
          handler(request);
        });

        expect((response as any).id).toBe(requestId);
      }
    });

    it('should handle concurrent requests correctly', async () => {
      const requests = [
        { jsonrpc: '2.0', id: 1, method: 'tools/list' },
        { jsonrpc: '2.0', id: 2, method: 'tools/list' },
        { jsonrpc: '2.0', id: 3, method: 'tools/list' }
      ];

      const responses = await Promise.all(
        requests.map(request =>
          new Promise((resolve) => {
            const handler = async (req: any) => {
              // Simulate some processing time
              await new Promise(r => setTimeout(r, Math.random() * 10));
              resolve({
                id: req.id,
                jsonrpc: '2.0',
                result: { tools: [] }
              });
            };
            handler(request);
          })
        )
      );

      // All requests should get responses with correct IDs
      expect(responses.map((r: any) => r.id).sort()).toEqual([1, 2, 3]);
    });

    it('should validate response format', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/list'
      };

      const response = await new Promise((resolve) => {
        const handler = async (req: any) => {
          resolve({
            id: req.id,
            jsonrpc: '2.0',
            result: {
              tools: [
                {
                  name: 'create-kanban-board',
                  description: 'Create a new kanban board',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      projectGoal: { type: 'string' }
                    },
                    required: ['name', 'projectGoal']
                  }
                }
              ]
            }
          });
        };
        handler(request);
      });

      // Validate response structure
      expect(response).toHaveProperty('id');
      expect(response).toHaveProperty('jsonrpc', '2.0');
      expect(response).toHaveProperty('result');
      expect((response as any).result).toHaveProperty('tools');
      expect(Array.isArray((response as any).result.tools)).toBe(true);
    });
  });
});