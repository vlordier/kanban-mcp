import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTaskById, updateTask, deleteTask } from '../services/api';
import MarkdownRenderer from './MarkdownRenderer';
import { useNotifications } from './NotificationContainer';

interface TaskDetailProps {
  taskId: string | null;
  onClose: () => void;
  onPrevTask?: () => void;
  onNextTask?: () => void;
  hasPrevTask?: boolean;
  hasNextTask?: boolean;
}

export default function TaskDetail({
  taskId,
  onClose,
  onPrevTask,
  onNextTask,
  hasPrevTask = false,
  hasNextTask = false,
}: TaskDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();
  const notifications = useNotifications();

  const {
    data: task,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => (taskId ? getTaskById(taskId) : null),
    enabled: !!taskId,
    staleTime: 0, // No caching - always fetch fresh data
    gcTime: 0, // Don't keep data in cache
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
  });

  // Set edit content when task data is loaded
  useEffect(() => {
    if (task) {
      setEditContent(task.content || '');
    }
  }, [task]);

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: { content?: string } }) =>
      updateTask(taskId, updates),
    onSuccess: () => {
      // Invalidate and refetch the task query to update the UI
      queryClient.invalidateQueries({ queryKey: ['task', taskId] as const });
      setIsEditing(false);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      // Invalidate the board query to refresh the task list
      queryClient.invalidateQueries({ queryKey: ['board'] });
      notifications.success('Task deleted successfully');
      onClose();
    },
    onError: error => {
      notifications.error(
        'Failed to delete task',
        error instanceof Error ? error.message : 'Unknown error'
      );
    },
  });

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveClick = () => {
    if (taskId) {
      updateTaskMutation.mutate({ taskId, updates: { content: editContent } });
    }
  };

  const handleCancelClick = () => {
    if (task) {
      setEditContent(task.content || '');
    }
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (taskId) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  if (!taskId) return null;

  return (
    <Dialog open={!!taskId} onClose={onClose} className="relative z-10">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
            <DialogPanel className="pointer-events-auto w-screen max-w-2xl transform transition duration-500 ease-in-out">
              <div className="flex h-full flex-col overflow-y-scroll bg-white py-6 shadow-xl">
                <div className="px-4 sm:px-6">
                  <div className="flex items-start justify-between">
                    <DialogTitle className="text-base font-semibold text-gray-900">
                      {isLoading ? 'Loading...' : error ? 'Error loading task' : task?.title}
                    </DialogTitle>
                    <div className="ml-3 flex h-7 items-center space-x-2">
                      {!isEditing && task && (
                        <>
                          <button
                            type="button"
                            onClick={handleEditClick}
                            className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            aria-label="Edit task"
                          >
                            <span className="absolute -inset-2.5" />
                            <PencilIcon className="h-5 w-5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteClick}
                            className="relative rounded-md bg-white text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            aria-label="Delete task"
                          >
                            <span className="absolute -inset-2.5" />
                            <TrashIcon className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </>
                      )}
                      {onPrevTask && !isEditing && (
                        <button
                          type="button"
                          onClick={onPrevTask}
                          disabled={!hasPrevTask}
                          className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Previous task"
                        >
                          <span className="absolute -inset-2.5" />
                          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                      )}
                      {onNextTask && !isEditing && (
                        <button
                          type="button"
                          onClick={onNextTask}
                          disabled={!hasNextTask}
                          className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Next task"
                        >
                          <span className="absolute -inset-2.5" />
                          <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={isEditing ? handleCancelClick : onClose}
                        className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        autoFocus
                      >
                        <span className="absolute -inset-2.5" />
                        <span className="sr-only">Close panel</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="relative mt-4 flex-1 px-4 sm:px-6">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                  ) : error ? (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                      <div className="flex">
                        <div className="ml-3">
                          <p className="text-sm text-red-700">
                            Error loading task:{' '}
                            {error instanceof Error ? error.message : 'Unknown error'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : task ? (
                    <div className="space-y-6 flex flex-col gap-4">
                      {isEditing ? (
                        <div className="flex flex-col gap-4">
                          <textarea
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            placeholder="Enter task description..."
                            className="w-full h-64 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={handleCancelClick}
                              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveClick}
                              disabled={updateTaskMutation.isPending}
                              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {updateTaskMutation.isPending ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                          {updateTaskMutation.isError && (
                            <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-2">
                              <div className="flex">
                                <div className="ml-3">
                                  <p className="text-sm text-red-700">
                                    Error updating task:{' '}
                                    {updateTaskMutation.error instanceof Error
                                      ? updateTaskMutation.error.message
                                      : 'Unknown error'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <MarkdownRenderer
                            content={task.content}
                            className="mt-2 text-sm text-gray-900"
                          />
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-medium text-gray-600">Details</h3>
                        <dl className="mt-2 divide-y divide-gray-200 border-t border-b border-gray-200">
                          <div className="flex justify-between py-3 text-sm">
                            <dt className="text-gray-500">Created</dt>
                            <dd className="text-gray-900">
                              {task.created_at ? new Date(task.created_at).toLocaleString() : 'Not available'}
                            </dd>
                          </div>
                          <div className="flex justify-between py-3 text-sm">
                            <dt className="text-gray-500">Updated</dt>
                            <dd className="text-gray-900">
                              {task.updated_at ? new Date(task.updated_at).toLocaleString() : 'Not available'}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <Dialog open={showDeleteConfirm} onClose={handleCancelDelete} className="relative z-[60]">
          <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel className="mx-auto max-w-sm rounded bg-white p-6 shadow-xl">
              <DialogTitle className="text-lg font-medium text-gray-900">Delete Task</DialogTitle>

              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete "{task?.title}"? This action cannot be undone.
                </p>
              </div>

              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  onClick={handleCancelDelete}
                  disabled={deleteTaskMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleConfirmDelete}
                  disabled={deleteTaskMutation.isPending}
                >
                  {deleteTaskMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </Dialog>
  );
}
