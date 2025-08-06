import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { getBoardWithColumnsAndTasks, moveTask, createTask } from '../services/api';
import Column from './Column';
import TaskDetail from './TaskDetail';
import { DragAndDropProvider } from '../contexts/DragAndDropContext';
import { useNotifications } from './NotificationContainer';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { BoardDetailSkeleton } from './LoadingSkeleton';

export default function BoardDetail() {
  const { boardId } = useParams<{ boardId: string }>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskContent, setNewTaskContent] = useState('');
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const queryClient = useQueryClient();
  const notifications = useNotifications();
  
  // Refs for column scrolling
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Function to scroll to a specific column
  const scrollToColumn = useCallback((columnId: string) => {
    const columnElement = columnRefs.current.get(columnId);
    if (columnElement) {
      columnElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest', 
        inline: 'center' 
      });
      // Add a visual highlight effect
      columnElement.style.boxShadow = '0 0 10px 2px rgba(59, 130, 246, 0.5)';
      setTimeout(() => {
        columnElement.style.boxShadow = '';
      }, 2000);
    }
  }, []);

  // Handle VSCode messages for column navigation
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).vscode) {
      const handleMessage = (event: MessageEvent) => {
        const message = event.data;
        if (message.type === 'scrollToColumn' && message.columnId) {
          scrollToColumn(message.columnId);
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
    return undefined;
  }, [scrollToColumn]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => (boardId ? getBoardWithColumnsAndTasks(boardId) : null),
    enabled: !!boardId,
    staleTime: 0, // No caching - always fetch fresh data
    gcTime: 0, // Don't keep data in cache
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
  });

  // Handle initial column scroll from VSCode
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).initialColumnId && data?.columns) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        scrollToColumn((window as any).initialColumnId);
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [data?.columns, scrollToColumn]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Cmd/Ctrl + N: Create new task in first column
      if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
        event.preventDefault();
        if (data?.columns && data.columns.length > 0) {
          setSelectedColumnId(data.columns[0]!.id);
          setIsCreateTaskDialogOpen(true);
        }
      }

      // Cmd/Ctrl + Shift + N: Create new task in landing column
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'N') {
        event.preventDefault();
        const landingColumn = data?.columns?.find(col => col.isLanding);
        if (landingColumn) {
          setSelectedColumnId(landingColumn.id);
          setIsCreateTaskDialogOpen(true);
        } else if (data?.columns && data.columns.length > 0) {
          setSelectedColumnId(data.columns[0]!.id);
          setIsCreateTaskDialogOpen(true);
        }
      }

      // Escape: Close task detail or dialogs
      if (event.key === 'Escape') {
        if (selectedTaskId) {
          setSelectedTaskId(null);
        } else if (isCreateTaskDialogOpen) {
          setIsCreateTaskDialogOpen(false);
        }
      }

      // ?: Show keyboard shortcuts help
      if (event.key === '?' && !event.shiftKey) {
        event.preventDefault();
        setShowKeyboardShortcuts(true);
      }

      // Arrow keys for column navigation
      if (event.key === 'ArrowLeft' && data?.columns) {
        event.preventDefault();
        const currentIndex = data.columns.findIndex(col => 
          columnRefs.current.get(col.id)?.style.boxShadow
        );
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : data.columns.length - 1;
        scrollToColumn(data.columns[prevIndex]!.id);
      }

      if (event.key === 'ArrowRight' && data?.columns) {
        event.preventDefault();
        const currentIndex = data.columns.findIndex(col => 
          columnRefs.current.get(col.id)?.style.boxShadow
        );
        const nextIndex = currentIndex < data.columns.length - 1 ? currentIndex + 1 : 0;
        scrollToColumn(data.columns[nextIndex]!.id);
      }

      // Number keys (1-9) for quick column access
      if (event.key >= '1' && event.key <= '9' && data?.columns) {
        event.preventDefault();
        const columnIndex = parseInt(event.key) - 1;
        if (columnIndex < data.columns.length) {
          scrollToColumn(data.columns[columnIndex]!.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [data?.columns, selectedTaskId, isCreateTaskDialogOpen, scrollToColumn]);

  const createTaskMutation = useMutation({
    mutationFn: ({
      columnId,
      title,
      content,
    }: {
      columnId: string;
      title: string;
      content: string;
    }) => createTask(columnId, title, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      setIsCreateTaskDialogOpen(false);
      setNewTaskTitle('');
      setNewTaskContent('');
      setSelectedColumnId(null);
      notifications.success('Task created successfully');
    },
    onError: error => {
      if (error instanceof Error && error.message.includes('capacity limit')) {
        notifications.error(
          'Column capacity limit reached',
          'This column has reached its maximum capacity. Complete or move existing tasks before adding new ones.'
        );
      } else {
        notifications.error(
          'Failed to create task',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    },
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
      content: newTaskContent.trim(),
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
      const taskIndex = column.tasks.findIndex(task => task.id === selectedTaskId);
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
      setSelectedTaskId(column.tasks[taskIndex - 1]!.id);
    }
  }, [currentColumnAndTaskIndex]);

  // Navigate to next task in the same column
  const handleNextTask = useCallback(() => {
    if (!currentColumnAndTaskIndex) return;

    const { column, taskIndex } = currentColumnAndTaskIndex;
    if (taskIndex < column.tasks.length - 1) {
      setSelectedTaskId(column.tasks[taskIndex + 1]!.id);
    }
  }, [currentColumnAndTaskIndex]);

  // Check if there are previous or next tasks available
  const hasPrevTask = useMemo(() => {
    return currentColumnAndTaskIndex ? currentColumnAndTaskIndex.taskIndex > 0 : false;
  }, [currentColumnAndTaskIndex]);

  const hasNextTask = useMemo(() => {
    if (!currentColumnAndTaskIndex) return false;
    const { column, taskIndex } = currentColumnAndTaskIndex;
    return taskIndex < column.tasks.length - 1;
  }, [currentColumnAndTaskIndex]);

  if (isLoading) {
    return <BoardDetailSkeleton />;
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
      await queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    } catch (error) {
      console.error('Failed to move task:', error);

      // Show detailed error message
      if (error instanceof Error) {
        if (error.message.includes('capacity limit')) {
          notifications.error(
            'Column capacity limit reached',
            'This column has reached its maximum capacity. Complete or move existing tasks before adding new ones.'
          );
        } else {
          notifications.error('Failed to move task', error.message);
        }
      } else {
        notifications.error(
          'Failed to move task',
          'An unexpected error occurred while moving the task.'
        );
      }

      // Refetch to ensure UI is in sync with server state
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });

      return Promise.reject(error);
    }
  };

  if (error || !data) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
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
      {/* Compact but readable breadcrumb and header */}
      <div className="mb-1">
        <div className="flex justify-between items-center">
          <nav className="flex items-center space-x-1" style={{ fontSize: '10px' }}>
            <Link
              to="/boards"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Boards
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-gray-900 font-medium truncate max-w-sm">{board.name}</h1>
          </nav>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowKeyboardShortcuts(true)}
              className="inline-flex items-center px-1.5 py-0.5 border border-gray-300 rounded text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-200"
              title="Keyboard shortcuts (?)"
            >
              <span className="text-xs">⌨️</span>
            </button>
            <Link
              to="/boards"
              className="inline-flex items-center px-1.5 py-0.5 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <svg className="w-2.5 h-2.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-gray-600" style={{ fontSize: '10px' }}>{board.goal}</p>
          <div className="flex items-center space-x-1 text-gray-500" style={{ fontSize: '9px' }}>
            <span>{columns.reduce((total, col) => total + col.tasks.length, 0)} tasks</span>
            <span>•</span>
            <span>{columns.length} cols</span>
          </div>
        </div>
      </div>

      <div className="overflow-visible pb-1">
        <DragAndDropProvider onMoveTask={handleMoveTask}>
          <div className="flex gap-1.5 min-w-max">
            {columns.map(column => (
              <div 
                key={column.id} 
                className="w-[200px]"
                ref={(el) => {
                  if (el) {
                    columnRefs.current.set(column.id, el);
                  } else {
                    columnRefs.current.delete(column.id);
                  }
                }}
              >
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

      {/* Keyboard Shortcuts Help Dialog */}
      <Dialog
        open={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-lg w-full rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mr-3">
                ⌨️
              </span>
              Keyboard Shortcuts
            </DialogTitle>
            
            <div className="space-y-4 text-sm">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Task Management</h4>
                <div className="space-y-2 text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between items-center">
                    <span>Create new task</span>
                    <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">⌘ N</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Create task in landing column</span>
                    <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">⌘ ⇧ N</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Close task/dialog</span>
                    <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Esc</kbd>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Navigation</h4>
                <div className="space-y-2 text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between items-center">
                    <span>Navigate left/right</span>
                    <div className="space-x-1">
                      <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">←</kbd>
                      <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">→</kbd>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Jump to column (1-9)</span>
                    <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">1-9</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Show this help</span>
                    <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">?</kbd>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowKeyboardShortcuts(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors duration-200"
              >
                Got it!
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

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
            <DialogTitle className="text-lg font-medium text-gray-900">Create New Task</DialogTitle>

            {selectedColumnId && data?.columns && (
              <p className="mt-1 text-sm text-gray-600">
                Adding to:{' '}
                <span className="font-medium">
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
                  onChange={e => setNewTaskTitle(e.target.value)}
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
                  onChange={e => setNewTaskContent(e.target.value)}
                  placeholder="Describe what needs to be done, why it needs to be done, and acceptance criteria..."
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  disabled={createTaskMutation.isPending}
                />
                <p className="mt-1 text-xs text-gray-500">Supports Markdown formatting</p>
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
                disabled={
                  createTaskMutation.isPending || !newTaskTitle.trim() || !newTaskContent.trim()
                }
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
