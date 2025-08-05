#!/bin/bash

# VSCode Kanban Extension Packaging Script
# This script packages the extension into a VSIX file for installation

echo "🚀 Starting VSCode Kanban Extension packaging..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "📂 Working directory: $PROJECT_DIR"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf out/
rm -f *.vsix

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the web UI first (required for webview)
echo "🎨 Building web UI..."
cd ../web-ui
npm run build
cd ../vscode-kanban-extension

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
npm run compile

# Run tests to ensure everything works
echo "🧪 Running tests..."
node ./out/test/runTest.js

if [ $? -ne 0 ]; then
    echo "❌ Tests failed! Aborting packaging."
    exit 1
fi

echo "✅ Tests passed!"

# Fix activation events warning (VS Code 1.75+)
echo "🔧 Fixing package.json for VS Code 1.75+..."
# Remove the explicit activation event as it's auto-generated
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.activationEvents && pkg.activationEvents.includes('onCommand:kanban-mcp.showKanbanBoard')) {
    pkg.activationEvents = [];
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    console.log('✅ Removed explicit activation events');
}
"

# Package the extension
echo "📦 Packaging extension..."
vsce package --no-yarn

# Find the generated VSIX file
VSIX_FILE=$(ls -t *.vsix 2>/dev/null | head -n1)

if [ -n "$VSIX_FILE" ]; then
    echo "✅ Extension packaged successfully: $VSIX_FILE"
    echo ""
    echo "📋 Installation Instructions:"
    echo "1. Option 1 - Command Line:"
    echo "   code --install-extension $VSIX_FILE"
    echo ""
    echo "2. Option 2 - VS Code UI:"
    echo "   - Open VS Code"
    echo "   - Go to Extensions (Ctrl+Shift+X)"
    echo "   - Click the '...' menu → 'Install from VSIX...'"
    echo "   - Select: $(pwd)/$VSIX_FILE"
    echo ""
    echo "3. Option 3 - Drag and Drop:"
    echo "   - Drag $VSIX_FILE into VS Code window"
    echo ""
    echo "🎯 After installation:"
    echo "   - Restart VS Code"
    echo "   - Start your Kanban servers:"
    echo "     cd ../web-server && npm run dev"  
    echo "   - Open Command Palette (Ctrl+Shift+P)"
    echo "   - Run: 'Kanban MCP: Show Kanban Board'"
    echo ""
    echo "🔍 Extension Details:"
    echo "   Name: Kanban MCP"
    echo "   File: $VSIX_FILE"
    echo "   Size: $(du -h "$VSIX_FILE" | cut -f1)"
    echo "   Location: $(pwd)"
else  
    echo "❌ Failed to package extension!"
    exit 1
fi