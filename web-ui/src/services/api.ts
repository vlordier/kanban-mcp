import { Board, ColumnWithTasks, Task } from '../types';

const API_BASE_URL = '/api';

export async function getAllBoards(): Promise<Board[]> {
  const response = await fetch(`${API_BASE_URL}/boards`);
  if (!response.ok) {
    throw new Error('Failed to fetch boards');
  }
  return response.json();
}

export async function getBoardWithColumnsAndTasks(boardId: string): Promise<{ board: Board; columns: ColumnWithTasks[] }> {
  const response = await fetch(`${API_BASE_URL}/boards/${boardId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch board with ID ${boardId}`);
  }
  return response.json();
}

export async function getTaskById(taskId: string): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch task with ID ${taskId}`);
  }
  return response.json();
}

export async function moveTask(taskId: string, targetColumnId: string, reason?: string): Promise<{
  success: boolean;
  message: string;
  taskId: string;
  sourceColumnId: string;
  targetColumnId: string;
}> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/move`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ targetColumnId, reason }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    // Handle specific error cases
    if (response.status === 422) {
      throw new Error(errorData.message || 'Column capacity limit reached');
    }
    throw new Error(errorData.error || `Failed to move task with ID ${taskId}`);
  }

  return response.json();
}

export async function updateTask(taskId: string, content: string): Promise<{
  success: boolean;
  message: string;
  task: Task;
}> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to update task with ID ${taskId}`);
  }

  return response.json();
}

export async function createBoard(name: string, goal: string): Promise<{
  success: boolean;
  message: string;
  boardId: string;
}> {
  const response = await fetch(`${API_BASE_URL}/boards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, goal }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create board');
  }

  return response.json();
}

export async function createTask(columnId: string, title: string, content: string): Promise<{
  success: boolean;
  message: string;
  task: Task;
}> {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ columnId, title, content }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (response.status === 422) {
      throw new Error(errorData.message || 'Column capacity limit reached');
    }
    throw new Error(errorData.error || 'Failed to create task');
  }

  return response.json();
}

export async function deleteTask(taskId: string): Promise<{
  success: boolean;
  message: string;
  taskId: string;
  changes: number;
}> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to delete task with ID ${taskId}`);
  }

  return response.json();
}

export async function deleteBoard(boardId: string): Promise<{
  success: boolean;
  message: string;
  boardId: string;
}> {
  const response = await fetch(`${API_BASE_URL}/boards/${boardId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to delete board with ID ${boardId}`);
  }

  return response.json();
}

export async function exportDatabase(): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/export`);
  
  if (!response.ok) {
    throw new Error('Failed to export database');
  }

  return response.blob();
}

export async function importDatabase(data: { boards: any[]; columns: any[]; tasks: any[] }): Promise<{
  success: boolean;
  message: string;
}> {
  const response = await fetch(`${API_BASE_URL}/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to import database');
  }

  return response.json();
}
