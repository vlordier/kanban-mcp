import * as vscode from 'vscode';

export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

export enum ErrorCategory {
    NETWORK = 'network',
    VALIDATION = 'validation',
    AUTHENTICATION = 'authentication',
    SERVER = 'server',
    CLIENT = 'client',
    UNKNOWN = 'unknown'
}

export interface KanbanError {
    code: string;
    message: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    originalError?: Error;
    context?: Record<string, any>;
    timestamp: number;
    recoveryActions?: RecoveryAction[];
}

export interface RecoveryAction {
    label: string;
    action: () => Promise<void> | void;
    isPrimary?: boolean;
}

export class ErrorHandler {
    private static instance: ErrorHandler;
    private logger: vscode.OutputChannel;
    private errorHistory: KanbanError[] = [];
    private maxHistorySize = 100;

    private constructor(logger: vscode.OutputChannel) {
        this.logger = logger;
    }

    static getInstance(logger?: vscode.OutputChannel): ErrorHandler {
        if (!ErrorHandler.instance) {
            if (!logger) {
                throw new Error('Logger is required for first initialization');
            }
            ErrorHandler.instance = new ErrorHandler(logger);
        }
        return ErrorHandler.instance;
    }

    handleError(error: Error | KanbanError | string, context?: Record<string, any>): KanbanError {
        const kanbanError = this.normalizeError(error, context);
        this.logError(kanbanError);
        this.addToHistory(kanbanError);
        this.showUserNotification(kanbanError);
        return kanbanError;
    }

    private normalizeError(error: Error | KanbanError | string, context?: Record<string, any>): KanbanError {
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
        const originalError = error as Error;
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

    private categorizeError(error: Error): { code: string; category: ErrorCategory; severity: ErrorSeverity } {
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

    private getRecoveryActions(error: Error): RecoveryAction[] {
        const message = error.message.toLowerCase();
        const actions: RecoveryAction[] = [];

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

    private logError(error: KanbanError): void {
        const logMessage = `[${error.severity.toUpperCase()}] ${error.code}: ${error.message}`;
        this.logger.appendLine(`❌ ${logMessage}`);
        
        if (error.context) {
            this.logger.appendLine(`   Context: ${JSON.stringify(error.context, null, 2)}`);
        }
        
        if (error.originalError) {
            this.logger.appendLine(`   Stack: ${error.originalError.stack}`);
        }
    }

    private addToHistory(error: KanbanError): void {
        this.errorHistory.unshift(error);
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
        }
    }

    private async showUserNotification(error: KanbanError): Promise<void> {
        const actions = error.recoveryActions || [];
        const actionLabels = actions.map(action => action.label);

        let showFunction: (message: string, ...items: string[]) => Thenable<string | undefined>;
        
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
                } catch (recoveryError) {
                    this.handleError(recoveryError as Error, { 
                        recoveryFor: error.code,
                        originalError: error.message 
                    });
                }
            }
        }
    }

    getErrorHistory(limit?: number): KanbanError[] {
        return limit ? this.errorHistory.slice(0, limit) : [...this.errorHistory];
    }

    clearHistory(): void {
        this.errorHistory = [];
        this.logger.appendLine('🧹 Error history cleared');
    }

    // Factory methods for common error types
    static createNetworkError(message: string, context?: Record<string, any>): KanbanError {
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

    static createValidationError(message: string, context?: Record<string, any>): KanbanError {
        return {
            code: 'VALIDATION_ERROR',
            message,
            category: ErrorCategory.VALIDATION,
            severity: ErrorSeverity.MEDIUM,
            context,
            timestamp: Date.now()
        };
    }

    static createServerError(message: string, context?: Record<string, any>): KanbanError {
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