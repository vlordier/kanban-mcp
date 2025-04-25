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
