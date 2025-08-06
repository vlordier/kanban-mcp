  🧪 Testing the VSCode Kanban Extension

  1. 🚀 Launch Extension Development Host

  The easiest way to test the extension:

  cd vscode-kanban-extension

  Then in VSCode:
  - Open the vscode-kanban-extension folder
  - Press F5 or go to Run > Start Debugging
  - This opens a new Extension Development Host window with your extension loaded

  2. 🔧 Prerequisites for Full Testing

  Before testing, ensure the Kanban servers are running:

  # Terminal 1: Start the web server
  cd web-server
  npm run dev

  # Terminal 2: Start the MCP server (if separate)
  cd mcp-server
  npm start

  3. 🎯 Test Extension Features

  In the Extension Development Host window:

  A. Command Palette Testing

  - Press Ctrl+Shift+P (or Cmd+Shift+P on Mac)
  - Search for "Kanban MCP" commands:
    - Kanban MCP: Show Kanban Board
    - Kanban MCP: Create New Board
    - Kanban MCP: Refresh Boards

  B. Sidebar Tree View Testing

  - Look for the Kanban icon in the Activity Bar (left sidebar)
  - Click it to open the Kanban explorer
  - You should see your boards, columns, and tasks in a tree structure
  - Test context menus (right-click on boards)

  C. Webview Testing

  - Run Kanban MCP: Show Kanban Board command
  - The webview should open with either:
    - The full React UI (if web-ui is built)
    - A fallback page with instructions and embedded iframe

  4. 🐛 Debugging Features

  Set Breakpoints

  - Open extension source files (src/extension.ts, etc.)
  - Click in the gutter to set breakpoints
  - Trigger extension actions to hit breakpoints

  Console Logging

  - Use console.log() in your extension code
  - View output in Extension Host Debug Console

  Webview Debugging

  If testing the embedded React UI:
  - Right-click in the webview panel
  - Select "Open Webview Developer Tools"
  - Debug the React app like a normal web application

  5. ⚙️ Configuration Testing

  Test the extension settings:
  - Go to File > Preferences > Settings
  - Search for "Kanban MCP"
  - Modify server URLs, auto-refresh settings
  - Verify the extension responds to configuration changes

  6. 🧪 Error Handling Testing

  Test error scenarios:
  - Stop the web server and try using extension commands
  - Use invalid server URLs in settings
  - Test with no boards created
  - Test network connectivity issues

  7. 📱 Advanced Testing Scenarios

  A. Test with Real Data

  # Create some test boards first via web UI or API
  curl -X POST http://localhost:3000/api/v1/boards \
    -H "Content-Type: application/json" \
    -d '{"name": "Test Board", "goal": "Testing VSCode extension"}'

  B. Test Auto-refresh

  - Create/modify boards in the web UI
  - Watch the VSCode extension sidebar update automatically

  C. Test Multiple Boards

  - Create several boards with different names
  - Verify tree view displays all boards correctly
  - Test opening different boards in webview

  8. 🔄 Development Workflow

  For continuous development:

  # Terminal 1: Watch mode for TypeScript compilation
  cd vscode-kanban-extension
  npm run watch

  # Then use F5 to launch Extension Host
  # Make changes to TypeScript files
  # Press Ctrl+R in Extension Host to reload the extension

  9. ✅ Verification Checklist

  - Extension activates without errors
  - Sidebar shows Kanban tree view
  - Commands appear in Command Palette
  - Webview opens and displays content
  - Can create new boards via extension
  - Tree view refreshes with new data
  - Settings are respected
  - Error messages appear for server issues
  - Context menus work on tree items

  10. 🚨 Troubleshooting

  Extension not appearing:
  - Check the Extension Host Debug Console for errors
  - Ensure npm run compile completed successfully
  - Verify package.json activation events

  Webview not loading:
  - Ensure web-ui is built: cd ../web-ui && npm run build
  - Check web server is running on correct port
  - Verify server URLs in extension settings

  API errors:
  - Check web server is accessible at configured URL
  - Test API endpoints directly with curl
  - Verify CORS settings if needed

  This testing approach will thoroughly validate your VSCode extension and ensure it integrates properly with the Kanban MCP
  system!