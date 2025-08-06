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
exports.ErrorHandler = exports.ErrorCategory = exports.ErrorSeverity = void 0;
const vscode = __importStar(require("vscode"));
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["LOW"] = "low";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["CRITICAL"] = "critical";
})(ErrorSeverity = exports.ErrorSeverity || (exports.ErrorSeverity = {}));
var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["NETWORK"] = "network";
    ErrorCategory["VALIDATION"] = "validation";
    ErrorCategory["AUTHENTICATION"] = "authentication";
    ErrorCategory["SERVER"] = "server";
    ErrorCategory["CLIENT"] = "client";
    ErrorCategory["UNKNOWN"] = "unknown";
})(ErrorCategory = exports.ErrorCategory || (exports.ErrorCategory = {}));
class ErrorHandler {
    constructor(logger) {
        this.errorHistory = [];
        this.maxHistorySize = 100;
        this.logger = logger;
    }
    static getInstance(logger) {
        if (!ErrorHandler.instance) {
            if (!logger) {
                throw new Error('Logger is required for first initialization');
            }
            ErrorHandler.instance = new ErrorHandler(logger);
        }
        return ErrorHandler.instance;
    }
    handleError(error, context) {
        const kanbanError = this.normalizeError(error, context);
        this.logError(kanbanError);
        this.addToHistory(kanbanError);
        this.showUserNotification(kanbanError);
        return kanbanError;
    }
    normalizeError(error, context) {
        if (typeof error === 'string') {
            return {
                code: 'GENERIC_ERROR',
                message: error,
                category: ErrorCategory.UNKNOWN,
                severity: ErrorSeverity.MEDIUM,
                context,
                timestamp: Date.now()
            };
        }
        if ('code' in error && 'category' in error) {
            // Already a KanbanError
            return { ...error, context: { ...error.context, ...context } };
        }
        // Convert regular Error to KanbanError
        const originalError = error;
        return {
            code: this.categorizeError(originalError).code,
            message: originalError.message,
            category: this.categorizeError(originalError).category,
            severity: this.categorizeError(originalError).severity,
            originalError,
            context,
            timestamp: Date.now(),
            recoveryActions: this.getRecoveryActions(originalError)
        };
    }
    categorizeError(error) {
        const message = error.message.toLowerCase();
        // Network errors
        if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
            return {
                code: 'NETWORK_ERROR',
                category: ErrorCategory.NETWORK,
                severity: ErrorSeverity.HIGH
            };
        }
        // Server errors
        if (message.includes('server') || message.includes('500') || message.includes('503')) {
            return {
                code: 'SERVER_ERROR',
                category: ErrorCategory.SERVER,
                severity: ErrorSeverity.HIGH
            };
        }
        // Authentication errors
        if (message.includes('auth') || message.includes('401') || message.includes('403')) {
            return {
                code: 'AUTH_ERROR',
                category: ErrorCategory.AUTHENTICATION,
                severity: ErrorSeverity.HIGH
            };
        }
        // Validation errors
        if (message.includes('invalid') || message.includes('validation') || message.includes('400')) {
            return {
                code: 'VALIDATION_ERROR',
                category: ErrorCategory.VALIDATION,
                severity: ErrorSeverity.MEDIUM
            };
        }
        // Default case
        return {
            code: 'UNKNOWN_ERROR',
            category: ErrorCategory.UNKNOWN,
            severity: ErrorSeverity.MEDIUM
        };
    }
    getRecoveryActions(error) {
        const message = error.message.toLowerCase();
        const actions = [];
        if (message.includes('connection') || message.includes('network')) {
            actions.push({
                label: '↻ Retry Connection',
                action: async () => {
                    // Trigger retry mechanism
                    vscode.commands.executeCommand('kanban-mcp.showHealthStatus');
                },
                isPrimary: true
            });
            actions.push({
                label: '🔧 Check Server Status',
                action: async () => {
                    vscode.commands.executeCommand('kanban-mcp.showHealthStatus');
                }
            });
        }
        if (message.includes('server')) {
            actions.push({
                label: '📋 View Logs',
                action: async () => {
                    this.logger.show();
                }
            });
        }
        // Always provide a generic refresh action
        actions.push({
            label: '🔄 Refresh',
            action: async () => {
                vscode.commands.executeCommand('kanban-mcp.refreshBoards');
            }
        });
        return actions;
    }
    logError(error) {
        const logMessage = `[${error.severity.toUpperCase()}] ${error.code}: ${error.message}`;
        this.logger.appendLine(`❌ ${logMessage}`);
        if (error.context) {
            this.logger.appendLine(`   Context: ${JSON.stringify(error.context, null, 2)}`);
        }
        if (error.originalError) {
            this.logger.appendLine(`   Stack: ${error.originalError.stack}`);
        }
    }
    addToHistory(error) {
        this.errorHistory.unshift(error);
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
        }
    }
    async showUserNotification(error) {
        const actions = error.recoveryActions || [];
        const actionLabels = actions.map(action => action.label);
        let showFunction;
        switch (error.severity) {
            case ErrorSeverity.CRITICAL:
            case ErrorSeverity.HIGH:
                showFunction = vscode.window.showErrorMessage;
                break;
            case ErrorSeverity.MEDIUM:
                showFunction = vscode.window.showWarningMessage;
                break;
            default:
                showFunction = vscode.window.showInformationMessage;
        }
        const selection = await showFunction(error.message, ...actionLabels);
        if (selection) {
            const selectedAction = actions.find(action => action.label === selection);
            if (selectedAction) {
                try {
                    await selectedAction.action();
                }
                catch (recoveryError) {
                    this.handleError(recoveryError, {
                        recoveryFor: error.code,
                        originalError: error.message
                    });
                }
            }
        }
    }
    getErrorHistory(limit) {
        return limit ? this.errorHistory.slice(0, limit) : [...this.errorHistory];
    }
    clearHistory() {
        this.errorHistory = [];
        this.logger.appendLine('🧹 Error history cleared');
    }
    // Factory methods for common error types
    static createNetworkError(message, context) {
        return {
            code: 'NETWORK_ERROR',
            message,
            category: ErrorCategory.NETWORK,
            severity: ErrorSeverity.HIGH,
            context,
            timestamp: Date.now(),
            recoveryActions: [
                {
                    label: '↻ Retry Connection',
                    action: async () => vscode.commands.executeCommand('kanban-mcp.showHealthStatus'),
                    isPrimary: true
                }
            ]
        };
    }
    static createValidationError(message, context) {
        return {
            code: 'VALIDATION_ERROR',
            message,
            category: ErrorCategory.VALIDATION,
            severity: ErrorSeverity.MEDIUM,
            context,
            timestamp: Date.now()
        };
    }
    static createServerError(message, context) {
        return {
            code: 'SERVER_ERROR',
            message,
            category: ErrorCategory.SERVER,
            severity: ErrorSeverity.HIGH,
            context,
            timestamp: Date.now(),
            recoveryActions: [
                {
                    label: '📋 View Logs',
                    action: async () => {
                        const logger = vscode.window.createOutputChannel('Kanban MCP Debug');
                        logger.show();
                    }
                }
            ]
        };
    }
}
exports.ErrorHandler = ErrorHandler;
//# sourceMappingURL=ErrorHandler.js.map