#!/bin/bash

# Clean VSCode Extension Test Runner
# Runs tests with minimal warnings and clean output

echo "🧹 Cleaning previous test artifacts..."
rm -rf .vscode-test/user-data 2>/dev/null
rm -rf /tmp/vscode-test-kanban 2>/dev/null

echo "🔨 Compiling extension..."
npm run compile

echo "🧪 Running tests with clean environment..."
npm test 2>&1 | grep -v "Via 'product.json#extensionEnabledApiProposals'" | grep -v "IPC handle" | grep -v "update#setState disabled" | grep -v "update#ctor"

echo "✅ Test run completed!"