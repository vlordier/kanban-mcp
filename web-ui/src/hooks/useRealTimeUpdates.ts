import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useRealTimeUpdates() {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<Date>(new Date());

  useEffect(() => {
    const invalidateQueries = () => {
      // Instead of fetching directly, just invalidate the cache
      // This lets React Query handle the fetching through the normal useQuery hooks
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      lastUpdateRef.current = new Date();
    };

    // Start polling every 30 seconds (reduced frequency)
    intervalRef.current = setInterval(invalidateQueries, 30000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [queryClient]);

  return {
    lastUpdate: lastUpdateRef.current,
    isPolling: !!intervalRef.current,
  };
}

