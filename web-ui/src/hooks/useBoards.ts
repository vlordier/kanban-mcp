import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  getAllBoards, 
  createBoard, 
  deleteBoard, 
  getBoardWithColumnsAndTasks 
} from '../services/api';
import { useApiError } from './useApiError';

export function useBoards() {
  const queryClient = useQueryClient();
  const { handleApiError } = useApiError();

  const boardsQuery = useQuery({
    queryKey: ['boards'],
    queryFn: getAllBoards,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  const createBoardMutation = useMutation({
    mutationFn: ({ name, goal }: { name: string; goal: string }) => 
      createBoard(name, goal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
    onError: (error) => handleApiError(error, 'Failed to create board'),
  });

  const deleteBoardMutation = useMutation({
    mutationFn: deleteBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
    onError: (error) => handleApiError(error, 'Failed to delete board'),
  });

  return {
    boards: boardsQuery.data ?? [],
    isLoading: boardsQuery.isLoading,
    isError: boardsQuery.isError,
    error: boardsQuery.error,
    refetch: boardsQuery.refetch,
    createBoard: createBoardMutation.mutate,
    deleteBoard: deleteBoardMutation.mutate,
    isCreating: createBoardMutation.isPending,
    isDeleting: deleteBoardMutation.isPending,
  };
}

export function useBoard(boardId: string) {
  const { handleApiError } = useApiError();

  return useQuery({
    queryKey: ['board', boardId],
    queryFn: () => getBoardWithColumnsAndTasks(boardId),
    enabled: !!boardId,
    staleTime: 15000, // Board data changes more frequently
    onError: (error) => handleApiError(error, 'Failed to load board'),
  });
}