#!/bin/bash

echo "🧪 Running Kanban MCP Test Suite"
echo "================================="

echo ""
echo "📋 1. Running Unit Tests..."
npm run test:run

echo ""
echo "🔍 2. Running TypeScript Type Checks..."
npm run typecheck

echo ""
echo "🌐 3. Running E2E Tests (Basic Functionality)..."
npx playwright test tests/e2e/basic-functionality.spec.ts --project=chromium --reporter=list

echo ""
echo "✅ Test Suite Complete!"