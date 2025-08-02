import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getAllBoards, deleteBoard, createBoard } from '../services/api';
import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useNotifications } from './NotificationContainer';

export default function BoardList() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardGoal, setNewBoardGoal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const notifications = useNotifications();
  
  const { data: boards, isLoading, error } = useQuery({
    queryKey: ['boards'],
    queryFn: getAllBoards,
  });

  const createBoardMutation = useMutation({
    mutationFn: ({ name, goal }: { name: string; goal: string }) => createBoard(name, goal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setIsCreateDialogOpen(false);
      setNewBoardName('');
      setNewBoardGoal('');
      notifications.success('Board created successfully');
    },
    onError: (error) => {
      notifications.error('Failed to create board', error instanceof Error ? error.message : 'Unknown error');
    }
  });

  const handleDeleteClick = (boardId: string, boardName: string) => {
    setBoardToDelete({ id: boardId, name: boardName });
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!boardToDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteBoard(boardToDelete.id);
      // Invalidate the boards query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      notifications.success('Board deleted successfully');
    } catch (error) {
      console.error('Error deleting board:', error);
      notifications.error('Failed to delete board', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setBoardToDelete(null);
    }
  };

  const handleCreateBoard = () => {
    if (!newBoardName.trim() || !newBoardGoal.trim()) {
      notifications.error('Validation error', 'Board name and goal are required');
      return;
    }
    createBoardMutation.mutate({ name: newBoardName.trim(), goal: newBoardGoal.trim() });
  };

  const handleCreateDialogClose = () => {
    if (!createBoardMutation.isPending) {
      setIsCreateDialogOpen(false);
      setNewBoardName('');
      setNewBoardGoal('');
    }
  };

  // Filter boards based on search query
  const filteredBoards = boards?.filter(board =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    board.goal.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
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
              Error loading boards: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show welcome screen if no boards exist at all
  if (boards && boards.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-16">
          <div className="mx-auto max-w-md">
            <svg className="mx-auto h-24 w-24 text-gray-300 mb-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to MCP Kanban!</h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Transform your project management with visual kanban boards. 
              Organize tasks, track progress, and collaborate effectively.
            </p>
            <div className="space-y-4 text-left bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">✨ What you can do:</h3>
              <div className="space-y-2 text-gray-600">
                <div className="flex items-start space-x-2">
                  <span className="text-indigo-600">•</span>
                  <span>Create unlimited kanban boards for different projects</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-indigo-600">•</span>
                  <span>Organize tasks in customizable columns (To Do, In Progress, Done)</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-indigo-600">•</span>
                  <span>Drag and drop tasks between columns</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-indigo-600">•</span>
                  <span>Set WIP limits to improve workflow efficiency</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-indigo-600">•</span>
                  <span>Write detailed task descriptions with Markdown support</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="inline-flex items-center gap-x-3 rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white shadow-xl hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all duration-200 hover:shadow-2xl hover:scale-105"
            >
              <PlusIcon className="h-6 w-6" aria-hidden="true" />
              Create your first board
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Kanban Boards</h1>
          <p className="mt-2 text-base text-gray-600">
            {filteredBoards.length} board{filteredBoards.length !== 1 ? 's' : ''} 
            {searchQuery ? (
              <span className="ml-1">
                found <span className="text-sm text-gray-500">(filtered from {boards?.length || 0} total)</span>
              </span>
            ) : (
              <span className="text-sm text-gray-500 ml-1">• Organize your projects and tasks</span>
            )}
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => setIsCreateDialogOpen(true)}
            className="inline-flex items-center gap-x-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all duration-200 hover:shadow-xl"
          >
            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            New Board
          </button>
        </div>
      </div>
      
      {/* Search bar */}
      <div className="mt-8">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search boards by name or goal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-lg border-0 py-2.5 pl-10 pr-12 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm transition-all duration-200"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <span className="text-sm font-medium">Clear</span>
            </button>
          )}
        </div>
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Goal
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Created At
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Updated At
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBoards.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        {searchQuery ? (
                          <>
                            <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p className="text-lg font-medium text-gray-900 mb-2">No boards found</p>
                            <p className="text-sm text-gray-500 mb-4">No boards match "{searchQuery}". Try a different search term.</p>
                            <button
                              onClick={() => setSearchQuery('')}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Clear search
                            </button>
                          </>
                        ) : (
                          <>
                            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
                            </svg>
                            <p className="text-xl font-semibold text-gray-900 mb-2">Welcome to MCP Kanban!</p>
                            <p className="text-base text-gray-600 mb-6 max-w-sm">
                              Get started by creating your first kanban board to organize your projects and tasks.
                            </p>
                            <button
                              onClick={() => setIsCreateDialogOpen(true)}
                              className="inline-flex items-center gap-x-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-base font-semibold text-white shadow-lg hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all duration-200"
                            >
                              <PlusIcon className="h-5 w-5" aria-hidden="true" />
                              Create your first board
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBoards.map((board) => (
                  <tr key={board.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-semibold text-gray-900 sm:pl-0">
                      {board.name}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 max-w-[300px] overflow-hidden text-ellipsis">
                      {board.goal}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(board.created_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(board.updated_at).toLocaleDateString()}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                      <div className="flex items-center justify-end gap-3">
                        <Link 
                          to={`/boards/${board.id}`} 
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-all duration-200"
                        >
                          View<span className="sr-only">, {board.name}</span>
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(board.id, board.name)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-all duration-200"
                        >
                          Delete<span className="sr-only">, {board.name}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => !isDeleting && setIsDeleteDialogOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-sm rounded bg-white p-6 shadow-xl">
            <DialogTitle className="text-lg font-medium text-gray-900">
              Delete Board
            </DialogTitle>
            
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete the board "{boardToDelete?.name}"? 
                This action cannot be undone and all tasks will be permanently deleted.
              </p>
            </div>

            <div className="mt-4 flex justify-end space-x-3">
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Create Board Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onClose={handleCreateDialogClose}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-md w-full rounded bg-white p-6 shadow-xl">
            <DialogTitle className="text-lg font-medium text-gray-900">
              Create New Board
            </DialogTitle>
            
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="board-name" className="block text-sm font-medium text-gray-700">
                  Board Name
                </label>
                <input
                  type="text"
                  id="board-name"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="Enter board name..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  disabled={createBoardMutation.isPending}
                />
              </div>
              
              <div>
                <label htmlFor="board-goal" className="block text-sm font-medium text-gray-700">
                  Project Goal
                </label>
                <textarea
                  id="board-goal"
                  value={newBoardGoal}
                  onChange={(e) => setNewBoardGoal(e.target.value)}
                  placeholder="Describe the project goal in 1-3 sentences..."
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  disabled={createBoardMutation.isPending}
                />
              </div>
            </div>

            {createBoardMutation.isError && (
              <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      {createBoardMutation.error instanceof Error 
                        ? createBoardMutation.error.message 
                        : 'Failed to create board'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                onClick={handleCreateDialogClose}
                disabled={createBoardMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCreateBoard}
                disabled={createBoardMutation.isPending || !newBoardName.trim() || !newBoardGoal.trim()}
              >
                {createBoardMutation.isPending ? 'Creating...' : 'Create Board'}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
