# 🔍 Comprehensive Linting & Code Quality Setup

This project implements the most stringent linting and code quality standards possible for a TypeScript/React monorepo.

## 📋 Overview

The linting setup includes:

- **ESLint with `eslint:all`** - Most stringent base rules
- **TypeScript strict mode** - Maximum type safety  
- **Prettier** - Consistent code formatting
- **Security scanning** - Static analysis for vulnerabilities
- **Accessibility validation** - WCAG compliance checks
- **Code quality metrics** - Complexity and maintainability analysis
- **Pre-commit hooks** - Automated quality gates
- **Dependency vulnerability scanning** - npm audit integration

## 🏗️ Architecture

### Packages Structure
```
kanban-mcp/
├── web-ui/          # React frontend with strict React/JSX rules
├── web-server/      # Fastify backend with Node.js security rules  
├── mcp-server/      # MCP protocol server with protocol-specific config
└── shared/db/       # Shared database utilities
```

### Configuration Files

Each package has its own specialized ESLint configuration:

- **`web-ui/.eslintrc.js`** - React + accessibility + security rules
- **`web-server/.eslintrc.js`** - Node.js + API security rules
- **`mcp-server/.eslintrc.js`** - MCP protocol optimized rules
- **`.eslintrc.root.js`** - Root-level workspace configuration

## 🔧 ESLint Configuration

### Base Rules
- `eslint:all` - All ESLint rules enabled
- `plugin:@typescript-eslint/all` - All TypeScript rules
- `plugin:security/recommended-legacy` - Security vulnerability detection
- `plugin:sonarjs/recommended-legacy` - Code quality analysis

### Package-Specific Rules

#### Web UI (React)
- `plugin:react/all` - All React rules  
- `plugin:jsx-a11y/strict` - Strictest accessibility rules
- `airbnb` + `airbnb-typescript` - Industry standard style guide

#### Web Server (Node.js)
- Enhanced security rules for server-side code
- API-specific patterns and best practices
- Database interaction safety

#### MCP Server
- Protocol-specific allowances (console usage, process.exit)
- Stream handling optimizations
- MCP message formatting rules

## 📏 Code Quality Metrics

### Complexity Limits
- **Cognitive Complexity**: 15 max
- **Cyclomatic Complexity**: 10 max  
- **Max Function Length**: 50-80 lines
- **Max File Length**: 300-400 lines
- **Max Parameters**: 4-5 per function
- **Max Nesting Depth**: 4 levels

### TypeScript Strictness
```json
{
  "strict": true,
  "noImplicitAny": true,
  "noImplicitReturns": true,
  "noUncheckedIndexedAccess": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "allowUnreachableCode": false
}
```

## 🔒 Security Features

### Static Analysis Rules
- Object injection detection
- Unsafe regex detection  
- Non-literal require() detection
- Child process spawn detection
- Buffer security validation
- Eval usage prevention

### Dependency Scanning
- `npm audit` integration
- Automated vulnerability reporting
- Moderate+ severity blocking

## ♿ Accessibility Validation

### WCAG Compliance
- `jsx-a11y/strict` configuration
- Color contrast validation
- Keyboard navigation requirements
- Screen reader compatibility
- ARIA usage validation

## 🚀 Usage

### Development Commands
```bash
# Lint all packages
npm run lint

# Auto-fix issues
npm run lint:fix  

# Format code
npm run format

# Type checking
npm run typecheck

# Security audit
npm run audit

# Full quality check
npm run quality
```

### Pre-commit Hooks

Git hooks automatically run on every commit:
1. **lint-staged** - Fixes and formats changed files
2. **Security audit** - Scans for vulnerabilities  
3. **Type checking** - Validates TypeScript

## 📊 Quality Metrics

The setup enforces:
- **Zero linting warnings** - All issues must be resolved
- **Zero TypeScript errors** - Strict type safety
- **Zero security vulnerabilities** - Moderate+ severity  
- **Consistent formatting** - Prettier compliance
- **Accessibility standards** - WCAG AA compliance

## 🛠️ Tools Used

- **ESLint 8.57.1** - Core linting engine
- **TypeScript 5.8+** - Type checking
- **Prettier 3.6+** - Code formatting  
- **Husky** - Git hooks management
- **lint-staged** - Staged file processing
- **SonarJS** - Code quality analysis

## 📈 Benefits

1. **Code Quality** - Enforces industry best practices
2. **Security** - Prevents common vulnerabilities
3. **Maintainability** - Reduces technical debt
4. **Accessibility** - Ensures inclusive design
5. **Team Consistency** - Standardized code style
6. **CI/CD Ready** - Automated quality gates

## 🔧 Customization

To adjust rules, modify the appropriate `.eslintrc.js` file:
- Disable overly strict rules with `'rule-name': 'off'`
- Adjust complexity limits in rule configuration
- Add project-specific overrides in `overrides` section

## 🚨 Troubleshooting

### Common Issues
1. **Rule conflicts** - Check rule precedence in extends array
2. **Performance** - Use `skipLibCheck: true` for external types
3. **False positives** - Add specific rule overrides
4. **Build failures** - Separate config files from type checking

This setup represents the most comprehensive linting infrastructure possible while maintaining practical usability.