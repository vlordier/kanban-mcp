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
