# Kanban MCP - VSCode Extension

A VSCode extension that integrates Kanban board management directly into your development environment using the Model Context Protocol (MCP).

## Features

- 📋 **Embedded Kanban Boards**: View and manage Kanban boards directly in VSCode
- 🌳 **Sidebar Tree View**: Quick access to all your boards, columns, and tasks
- 🔄 **Real-time Sync**: Auto-refresh boards and sync with the web server
- ⚡ **Quick Actions**: Create boards and tasks with simple commands
- 🎨 **Native VSCode UI**: Follows VSCode's theme and design patterns

## Requirements

Before using this extension, you need to have the Kanban MCP servers running:

1. **Web Server** (default: http://localhost:3000)
2. **MCP Server** (default: http://localhost:3001)

## Installation

### From Source

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd kanban-mcp/vscode-kanban-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the web UI (required for embedded view):
   ```bash
   cd ../web-ui
   npm run build
   ```

4. Compile the extension:
   ```bash
   cd ../vscode-kanban-extension
   npm run compile
   ```

5. Open in VSCode and press `F5` to run the extension in a new Extension Development Host window.

## Usage

### Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:

- **`Kanban MCP: Show Kanban Board`** - Open the main Kanban board view
- **`Kanban MCP: Create New Board`** - Create a new Kanban board
- **`Kanban MCP: Refresh Boards`** - Refresh the boards list

### Sidebar

The extension adds a **Kanban** view to the Activity Bar where you can:

- Browse all your boards
- View columns and task counts
- Click on boards to open them
- See tasks organized by columns

### Webview Integration

The extension embeds the full React web UI in a VSCode webview, providing:

- Full Kanban board functionality
- Drag-and-drop task management
- Real-time updates
- Responsive design that adapts to VSCode themes

## Configuration

Configure the extension in VSCode settings:

```json
{
  "kanban-mcp.mcpServerUrl": "http://localhost:3001",
  "kanban-mcp.webServerUrl": "http://localhost:3000", 
  "kanban-mcp.autoRefresh": true,
  "kanban-mcp.refreshInterval": 30000
}
```

### Settings

- **`kanban-mcp.mcpServerUrl`**: URL of the MCP Kanban server (default: `http://localhost:3001`)
- **`kanban-mcp.webServerUrl`**: URL of the Kanban web server (default: `http://localhost:3000`)
- **`kanban-mcp.autoRefresh`**: Automatically refresh boards (default: `true`)
- **`kanban-mcp.refreshInterval`**: Auto refresh interval in milliseconds (default: `30000`)

## Architecture

```
┌─────────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   VSCode Extension  │    │   Web Server     │    │   MCP Server    │
│                     │    │  (REST API)      │    │   (Protocol)    │
│  ┌───────────────┐  │    │                  │    │                 │
│  │  Tree View    │  │◄──►│  /api/v1/boards  │◄──►│  Kanban Tools   │
│  │  Commands     │  │    │  /api/v1/tasks   │    │  Board Mgmt     │
│  │  Webview      │  │    │  /health         │    │  Task Mgmt      │
│  └───────────────┘  │    │                  │    │                 │
└─────────────────────┘    └──────────────────┘    └─────────────────┘
           │                         │                        │
           └─────────────────────────┼────────────────────────┘
                                     │
                               ┌──────────┐
                               │ Database │
                               │ (SQLite) │
                               └──────────┘
```

## Development

### Building

```bash
npm run compile        # Compile TypeScript
npm run watch          # Watch for changes
npm run lint          # Run ESLint
```

### Testing

1. Press `F5` in VSCode to launch the Extension Development Host
2. In the new window, open the Command Palette and run Kanban MCP commands
3. Check the sidebar for the Kanban tree view

### Debugging

- Set breakpoints in TypeScript files
- Use `console.log()` statements (output appears in the Extension Host Debug Console)
- Check the Developer Tools for webview debugging

## Project Structure

```
vscode-kanban-extension/
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── mcp/
│   │   └── MCPClient.ts          # API client for Kanban server
│   ├── tree/
│   │   └── KanbanTreeDataProvider.ts  # Sidebar tree view
│   └── webview/
│       └── KanbanWebviewProvider.ts   # Webview integration
├── out/                          # Compiled JavaScript
├── package.json                  # Extension manifest
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test the extension
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Troubleshooting

### Web UI Not Loading

If the embedded webview shows a fallback page:

1. Build the web UI: `cd ../web-ui && npm run build`
2. Reload the webview panel

### Cannot Connect to Server

If you see connection errors:

1. Ensure the web server is running: `cd ../web-server && npm run dev`
2. Check the server URLs in settings
3. Verify the servers are accessible at the configured URLs

### Extension Not Activating

1. Check the Extension Host Debug Console for errors
2. Ensure all dependencies are installed: `npm install`
3. Recompile the extension: `npm run compile`