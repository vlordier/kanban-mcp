import { Board, Column, ColumnWithTasks, Task } from '../types';

const API_BASE_URL = '/api/v1';

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
  content: string
): Promise<{
  success: boolean;
  message: string;
  task: Task;
}> {
  return apiRequest(`/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

export async function createBoard(
  name: string,
  goal: string
): Promise<{
  success: boolean;
  message: string;
  boardId: string;
}> {
  return apiRequest('/boards', {
    method: 'POST',
    body: JSON.stringify({ name, goal }),
  });
}

export async function createTask(
  columnId: string,
  title: string,
  content: string
): Promise<{
  success: boolean;
  message: string;
  task: Task;
}> {
  return apiRequest('/tasks', {
    method: 'POST',
    body: JSON.stringify({ columnId, title, content }),
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
  const response = await fetch(`${API_BASE_URL}/export`);

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({
      error: 'Failed to export database',
    }));

    throw new ApiException(errorData.error, response.status, errorData.errorId, errorData.details);
  }

  return response.blob();
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
