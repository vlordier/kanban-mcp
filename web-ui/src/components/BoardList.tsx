import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getAllBoards, deleteBoard } from '../services/api';
import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

export default function BoardList() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: boards, isLoading, error } = useQuery({
    queryKey: ['boards'],
    queryFn: getAllBoards,
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
    } catch (error) {
      console.error('Error deleting board:', error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setBoardToDelete(null);
    }
  };

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

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold text-gray-900">Kanban Boards</h1>
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
                {boards?.map((board) => (
                  <tr key={board.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                      {board.name}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 max-w-[200px] overflow-hidden text-ellipsis">{board.goal}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(board.created_at).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(board.updated_at).toLocaleString()}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                      <Link to={`/boards/${board.id}`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                        View<span className="sr-only">, {board.name}</span>
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(board.id, board.name)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete<span className="sr-only">, {board.name}</span>
                      </button>
                    </td>
                  </tr>
                ))}
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
    </div>
  );
}
