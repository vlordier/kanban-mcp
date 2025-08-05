import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAllBoards,
  createBoard,
  deleteBoard,
  getBoardWithColumnsAndTasks,
} from '../services/api';
import { useApiError } from './useApiError';

export function useBoards() {
  const queryClient = useQueryClient();
  const { handleApiError } = useApiError();

  console.log('🔄 useBoards hook called');

  const boardsQuery = useQuery({
    queryKey: ['boards'],
    queryFn: () => {
      console.log('🚀 getAllBoards queryFn called - timestamp:', Date.now());
      const startTime = Date.now();
      return getAllBoards().then(result => {
        console.log('✅ getAllBoards completed in', Date.now() - startTime, 'ms, result count:', result?.length, 'data:', result);
        return result;
      }).catch(error => {
        console.error('❌ getAllBoards failed after', Date.now() - startTime, 'ms, error:', error);
        throw error;
      });
    },
    staleTime: 60000, // 1 minute - much longer to prevent loops
    gcTime: 300000, // 5 minutes - keep data longer
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: true, // Fetch once on mount
    refetchOnReconnect: false, // Don't refetch on reconnect to prevent loops
    retry: 1, // Only retry once on failure
    retryDelay: 5000, // Wait 5 seconds before retry
    refetchInterval: false, // Ensure no automatic refetching
    refetchIntervalInBackground: false, // Ensure no background refetching
    networkMode: 'always', // Always try the network
  });

  const createBoardMutation = useMutation({
    mutationFn: ({ name, goal }: { name: string; goal: string }) => createBoard(name, goal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
    onError: error => handleApiError(error, 'Failed to create board'),
  });

  const deleteBoardMutation = useMutation({
    mutationFn: deleteBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
    onError: error => handleApiError(error, 'Failed to delete board'),
  });

  return {
    boards: boardsQuery.data ?? [],
    isLoading: boardsQuery.isLoading,
    isError: boardsQuery.isError,
    error: boardsQuery.error,
    refetch: boardsQuery.refetch,
    createBoard: (name: string, goal: string) => createBoardMutation.mutate({ name, goal }),
    deleteBoard: (id: string) => deleteBoardMutation.mutate(id),
    isCreating: createBoardMutation.isPending,
    isDeleting: deleteBoardMutation.isPending,
  };
}

export function useBoard(boardId: string) {
  return useQuery({
    queryKey: ['board', boardId],
    queryFn: () => getBoardWithColumnsAndTasks(boardId),
    enabled: !!boardId,
    staleTime: 1000, // Minimal caching - 1 second freshness
    gcTime: 5000, // Keep data for 5 seconds
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
    refetchOnReconnect: false, // Don't refetch on reconnect to prevent loops
    retry: 1, // Only retry once on failure
    retryDelay: 2000, // Wait 2 seconds before retry
  });
}
