import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBoardWithColumnsAndTasks } from '../services/api';
import Column from './Column';
import TaskDetail from './TaskDetail';

export default function BoardDetail() {
  const { boardId } = useParams<{ boardId: string }>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => (boardId ? getBoardWithColumnsAndTasks(boardId) : null),
    enabled: !!boardId,
  });

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const handleCloseTaskDetail = () => {
    setSelectedTaskId(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              Error loading board: {error instanceof Error ? error.message : 'Board not found'}
            </p>
            <div className="mt-2">
              <Link to="/boards" className="text-sm font-medium text-red-700 hover:text-red-600">
                Go back to boards list
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { board, columns } = data;

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{board.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{board.goal}</p>
          </div>
          <Link
            to="/boards"
            className="ml-6 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Back to Boards
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto pb-6">
        <div className="flex gap-4 min-w-max">
          {columns.map((column) => (
            <div key={column.id} className="w-[280px]">
              <Column column={column} onTaskClick={handleTaskClick} />
            </div>
          ))}
        </div>
      </div>

      <TaskDetail taskId={selectedTaskId} onClose={handleCloseTaskDetail} />
    </div>
  );
}