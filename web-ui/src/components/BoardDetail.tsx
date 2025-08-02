import { useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getBoardWithColumnsAndTasks, moveTask, createTask } from "../services/api";
import Column from "./Column";
import TaskDetail from "./TaskDetail";
import { DragAndDropProvider } from "../contexts/DragAndDropContext";
import { useNotifications } from "./NotificationContainer";
import { PlusIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

export default function BoardDetail() {
  const { boardId } = useParams<{ boardId: string }>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskContent, setNewTaskContent] = useState('');
  const queryClient = useQueryClient();
  const notifications = useNotifications();

  const { data, isLoading, error } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => (boardId ? getBoardWithColumnsAndTasks(boardId) : null),
    enabled: !!boardId,
  });

  const createTaskMutation = useMutation({
    mutationFn: ({ columnId, title, content }: { columnId: string; title: string; content: string }) =>
      createTask(columnId, title, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setIsCreateTaskDialogOpen(false);
      setNewTaskTitle('');
      setNewTaskContent('');
      setSelectedColumnId(null);
      notifications.success('Task created successfully');
    },
    onError: (error) => {
      if (error instanceof Error && error.message.includes('capacity limit')) {
        notifications.error(
          'Column capacity limit reached',
          'This column has reached its maximum capacity. Complete or move existing tasks before adding new ones.'
        );
      } else {
        notifications.error('Failed to create task', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  });

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const handleCloseTaskDetail = () => {
    setSelectedTaskId(null);
  };

  const handleCreateTaskClick = (columnId: string) => {
    setSelectedColumnId(columnId);
    setIsCreateTaskDialogOpen(true);
  };

  const handleCreateTask = () => {
    if (!selectedColumnId || !newTaskTitle.trim() || !newTaskContent.trim()) {
      notifications.error('Validation error', 'Task title and content are required');
      return;
    }
    createTaskMutation.mutate({
      columnId: selectedColumnId,
      title: newTaskTitle.trim(),
      content: newTaskContent.trim()
    });
  };

  const handleCreateTaskDialogClose = () => {
    if (!createTaskMutation.isPending) {
      setIsCreateTaskDialogOpen(false);
      setNewTaskTitle('');
      setNewTaskContent('');
      setSelectedColumnId(null);
    }
  };

  // Find the current column and task index
  const currentColumnAndTaskIndex = useMemo(() => {
    if (!selectedTaskId || !data?.columns) return null;

    for (const column of data.columns) {
      const taskIndex = column.tasks.findIndex(
        (task) => task.id === selectedTaskId
      );
      if (taskIndex !== -1) {
        return { column, taskIndex };
      }
    }
    return null;
  }, [selectedTaskId, data?.columns]);

  // Navigate to previous task in the same column
  const handlePrevTask = useCallback(() => {
    if (!currentColumnAndTaskIndex) return;

    const { column, taskIndex } = currentColumnAndTaskIndex;
    if (taskIndex > 0) {
      setSelectedTaskId(column.tasks[taskIndex - 1].id);
    }
  }, [currentColumnAndTaskIndex]);

  // Navigate to next task in the same column
  const handleNextTask = useCallback(() => {
    if (!currentColumnAndTaskIndex) return;

    const { column, taskIndex } = currentColumnAndTaskIndex;
    if (taskIndex < column.tasks.length - 1) {
      setSelectedTaskId(column.tasks[taskIndex + 1].id);
    }
  }, [currentColumnAndTaskIndex]);

  // Check if there are previous or next tasks available
  const hasPrevTask = useMemo(() => {
    return currentColumnAndTaskIndex
      ? currentColumnAndTaskIndex.taskIndex > 0
      : false;
  }, [currentColumnAndTaskIndex]);

  const hasNextTask = useMemo(() => {
    if (!currentColumnAndTaskIndex) return false;
    const { column, taskIndex } = currentColumnAndTaskIndex;
    return taskIndex < column.tasks.length - 1;
  }, [currentColumnAndTaskIndex]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Handle moving a task between columns
  const handleMoveTask = async (
    taskId: string,
    _sourceColumnId: string,
    destinationColumnId: string
  ) => {
    try {
      // Perform the actual API call
      await moveTask(taskId, destinationColumnId);

      // Invalidate the query to refetch the board data
      await queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    } catch (error) {
      console.error("Failed to move task:", error);

      // Show detailed error message
      if (error instanceof Error) {
        if (error.message.includes("capacity limit")) {
          notifications.error(
            "Column capacity limit reached",
            "This column has reached its maximum capacity. Complete or move existing tasks before adding new ones."
          );
        } else {
          notifications.error("Failed to move task", error.message);
        }
      } else {
        notifications.error(
          "Failed to move task",
          "An unexpected error occurred while moving the task."
        );
      }

      // Refetch to ensure UI is in sync with server state
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });

      return Promise.reject(error);
    }
  };

  if (error || !data) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              Error loading board:{" "}
              {error instanceof Error ? error.message : "Board not found"}
            </p>
            <div className="mt-2">
              <Link
                to="/boards"
                className="text-sm font-medium text-red-700 hover:text-red-600"
              >
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
      {/* Breadcrumb navigation */}
      <div className="mb-4">
        <nav className="flex items-center space-x-2 text-sm">
          <Link to="/boards" className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-200">
            Boards
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-700 font-medium">{board.name}</span>
        </nav>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{board.name}</h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-3xl">{board.goal}</p>
            <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
              <span>Created {new Date(board.created_at).toLocaleDateString()}</span>
              <span>•</span>
              <span>{columns.reduce((total, col) => total + col.tasks.length, 0)} tasks total</span>
              <span>•</span>
              <span>{columns.length} columns</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 ml-6">
            <Link
              to="/boards"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Boards
            </Link>
          </div>
        </div>
      </div>

      <div className="overflow-visible pb-6">
        <DragAndDropProvider onMoveTask={handleMoveTask}>
          <div className="flex gap-4 min-w-max">
            {columns.map((column) => (
              <div key={column.id} className="w-[280px]">
                <Column 
                  column={column} 
                  onTaskClick={handleTaskClick}
                  onCreateTaskClick={handleCreateTaskClick}
                />
              </div>
            ))}
          </div>
        </DragAndDropProvider>
      </div>

      <TaskDetail
        taskId={selectedTaskId}
        onClose={handleCloseTaskDetail}
        onPrevTask={handlePrevTask}
        onNextTask={handleNextTask}
        hasPrevTask={hasPrevTask}
        hasNextTask={hasNextTask}
      />

      {/* Create Task Dialog */}
      <Dialog
        open={isCreateTaskDialogOpen}
        onClose={handleCreateTaskDialogClose}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-lg w-full rounded bg-white p-6 shadow-xl">
            <DialogTitle className="text-lg font-medium text-gray-900">
              Create New Task
            </DialogTitle>
            
            {selectedColumnId && data?.columns && (
              <p className="mt-1 text-sm text-gray-600">
                Adding to: <span className="font-medium">
                  {data.columns.find(col => col.id === selectedColumnId)?.name}
                </span>
              </p>
            )}
            
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="task-title" className="block text-sm font-medium text-gray-700">
                  Task Title
                </label>
                <input
                  type="text"
                  id="task-title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Enter task title..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  disabled={createTaskMutation.isPending}
                />
              </div>
              
              <div>
                <label htmlFor="task-content" className="block text-sm font-medium text-gray-700">
                  Task Description
                </label>
                <textarea
                  id="task-content"
                  value={newTaskContent}
                  onChange={(e) => setNewTaskContent(e.target.value)}
                  placeholder="Describe what needs to be done, why it needs to be done, and acceptance criteria..."
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  disabled={createTaskMutation.isPending}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Supports Markdown formatting
                </p>
              </div>
            </div>

            {createTaskMutation.isError && (
              <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      {createTaskMutation.error instanceof Error 
                        ? createTaskMutation.error.message 
                        : 'Failed to create task'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                onClick={handleCreateTaskDialogClose}
                disabled={createTaskMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCreateTask}
                disabled={createTaskMutation.isPending || !newTaskTitle.trim() || !newTaskContent.trim()}
              >
                {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
