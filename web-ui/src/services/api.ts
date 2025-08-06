import { Board, Column, ColumnWithTasks, Task } from '../types';

// Check if running in VSCode webview context
const isVSCodeWebview = (): boolean => {
  return typeof window !== 'undefined' && 
         (window as any).vscode && 
         typeof (window as any).vscode.postMessage === 'function';
};

// Get API base URL (used for non-VSCode contexts)
const getApiBaseUrl = (): string => {
  // Check if we're in VSCode webview context and have injected API_BASE_URL
  if (typeof window !== 'undefined' && (window as any).API_BASE_URL) {
    return `${(window as any).API_BASE_URL}/api`;
  }
  // Fallback to relative path for normal web context
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

// Fixed VSCode message passing helper with proper error handling and no loops
const vsCodeApiRequest = <T>(method: string, endpoint: string, data?: any): Promise<T> => {
  console.log('🔄 vsCodeApiRequest called:', { method, endpoint, data });
  
  if (!isVSCodeWebview()) {
    console.error('❌ Not in VSCode webview context');
    throw new Error('Not in VSCode webview context');
  }

  // Always use the direct implementation to avoid issues with injected functions
  return new Promise((resolve, reject) => {
    const requestId = `req_${Date.now()}_${Math.random()}`;
    
    // Initialize message handling if not already done
    if (!(window as any).vsCodeMessageListenerSetup) {
      (window as any).vsCodeMessageListenerSetup = true;
      (window as any).vsCodeMessageHandlers = new Map();
      
      window.addEventListener('message', (event) => {
        const message = event.data;
        if (message && typeof message === 'object' && message.type === 'apiResponse' && message.requestId) {
          const handlers = (window as any).vsCodeMessageHandlers;
          if (handlers?.has(message.requestId)) {
            const handler = handlers.get(message.requestId);
            handlers.delete(message.requestId);
            
            if (message.success) {
              console.log('✅ VSCode API success:', message.requestId);
              handler.resolve(message.data);
            } else {
              console.error('❌ VSCode API error:', message.requestId, message.error);
              handler.reject(new Error(message.error || 'Unknown API error'));
            }
          }
        }
      });
    }
    
    // Store the handlers
    const handlers = (window as any).vsCodeMessageHandlers;
    handlers.set(requestId, { resolve, reject });
    
    console.log('🔄 Sending VSCode API request:', { requestId, method, endpoint, data });
    
    try {
      // Send the request
      (window as any).vscode.postMessage({
        type: 'apiRequest',
        requestId,
        method,
        endpoint,
        data
      });
    } catch (error) {
      handlers.delete(requestId);
      reject(new Error(`Failed to send API request: ${error}`));
      return;
    }
    
    // Set reasonable timeout
    setTimeout(() => {
      if (handlers?.has(requestId)) {
        handlers.delete(requestId);
        reject(new Error(`Request timeout after 10s: ${method} ${endpoint}`));
      }
    }, 10000);
  });
};

interface ApiError {
  error: string;
  errorId?: string;
  timestamp?: string;
  details?: Array<{ path: string; message: string; code: string }>;
}

class ApiException extends Error {
  constructor(
    message: string,
    public status: number,
    public errorId?: string,
    public details?: Array<{ path: string; message: string; code: string }>
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Use VSCode message passing if in webview context
  if (isVSCodeWebview()) {
    const method = options.method || 'GET';
    const data = options.body ? JSON.parse(options.body as string) : undefined;
    return vsCodeApiRequest<T>(method, endpoint, data);
  }

  // Fallback to direct HTTP request for normal web context
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({
      error: 'Unknown error occurred',
    }));

    throw new ApiException(errorData.error, response.status, errorData.errorId, errorData.details);
  }

  return response.json();
}

export async function getAllBoards(): Promise<Board[]> {
  return apiRequest<Board[]>('/boards');
}

export async function getBoardWithColumnsAndTasks(
  boardId: string
): Promise<{ board: Board; columns: ColumnWithTasks[] }> {
  return apiRequest<{ board: Board; columns: ColumnWithTasks[] }>(`/boards/${boardId}`);
}

export async function getTaskById(taskId: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}`);
}

export async function moveTask(
  taskId: string,
  targetColumnId: string,
  reason?: string
): Promise<{
  success: boolean;
  message: string;
  taskId: string;
  sourceColumnId: string;
  targetColumnId: string;
}> {
  return apiRequest(`/tasks/${taskId}/move`, {
    method: 'POST',
    body: JSON.stringify({ targetColumnId, reason }),
  });
}

export async function updateTask(
  taskId: string,
  updates: { title?: string; content?: string }
): Promise<{
  success: boolean;
  message: string;
  task: Task;
}> {
  const sanitizedUpdates: { title?: string; content?: string } = {};
  
  if (updates.title !== undefined) {
    sanitizedUpdates.title = updates.title.trim() || 'Untitled Task';
  }
  if (updates.content !== undefined) {
    sanitizedUpdates.content = updates.content.trim() || '';
  }
  
  return apiRequest(`/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(sanitizedUpdates),
  });
}

export async function createBoard(
  name: string,
  goal: string = ''
): Promise<{
  success: boolean;
  message: string;
  boardId: string;
}> {
  return apiRequest('/boards', {
    method: 'POST',
    body: JSON.stringify({ 
      name: name.trim() || 'Untitled Board', 
      goal: goal.trim() || '' 
    }),
  });
}

export async function createTask(
  columnId: string,
  title: string,
  content: string = ''
): Promise<{
  success: boolean;
  message: string;
  task: Task;
}> {
  return apiRequest('/tasks', {
    method: 'POST',
    body: JSON.stringify({ 
      columnId, 
      title: title.trim() || 'Untitled Task', 
      content: content.trim() || '' 
    }),
  });
}

export async function deleteTask(taskId: string): Promise<{
  success: boolean;
  message: string;
  taskId: string;
  changes: number;
}> {
  return apiRequest(`/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

export async function deleteBoard(boardId: string): Promise<{
  success: boolean;
  message: string;
  boardId: string;
}> {
  return apiRequest(`/boards/${boardId}`, {
    method: 'DELETE',
  });
}

export async function exportDatabase(): Promise<Blob> {
  // Use VSCode message passing if in webview context
  if (isVSCodeWebview()) {
    const data = await vsCodeApiRequest<string>('GET', '/export');
    return new Blob([data], { type: 'application/json' });
  }

  const response = await fetch(`${API_BASE_URL}/export`);

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({
      error: 'Failed to export database',
    }));

    throw new ApiException(errorData.error, response.status, errorData.errorId, errorData.details);
  }

  return response.blob();
}

export async function exportToFileSystem(options: {
  includeMetadata?: boolean;
  separateFiles?: boolean;
}): Promise<{
  success: boolean;
  message: string;
  exportPath?: string;
  files?: Array<{ name: string; path: string; size: number }>;
  stats?: { boards: number; columns: number; tasks: number };
}> {
  // Only available in VSCode context
  if (!isVSCodeWebview()) {
    throw new ApiException('File system export only available in VSCode extension', 501);
  }

  return vsCodeApiRequest<{
    success: boolean;
    message: string;
    exportPath?: string;
    files?: Array<{ name: string; path: string; size: number }>;
    stats?: { boards: number; columns: number; tasks: number };
  }>('POST', '/export-to-file', options);
}

export async function importDatabase(data: {
  boards: Board[];
  columns: Column[];
  tasks: Task[];
}): Promise<{
  success: boolean;
  message: string;
}> {
  return apiRequest('/import', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
