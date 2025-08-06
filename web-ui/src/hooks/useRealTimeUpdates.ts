import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAllBoards } from '../services/api';

export function useRealTimeUpdates() {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<Date>(new Date());

  useEffect(() => {
    const pollForUpdates = async () => {
      try {
        // Get fresh data from server
        const freshBoards = await getAllBoards();
        
        // Get cached data
        const cachedBoards = queryClient.getQueryData(['boards']);
        
        // Check if data has changed
        if (JSON.stringify(freshBoards) !== JSON.stringify(cachedBoards)) {
          console.log('🔄 Real-time update detected, refreshing data...');
          
          // Update cache with fresh data
          queryClient.setQueryData(['boards'], freshBoards);
          
          // Show notification for changes
          const now = new Date();
          if (cachedBoards && freshBoards) {
            // Detect what changed
            const changes = detectChanges(cachedBoards as any[], freshBoards);
            if (changes.length > 0) {
              // Emit custom event for notifications
              window.dispatchEvent(new CustomEvent('boardsUpdated', { 
                detail: { changes, timestamp: now }
              }));
            }
          }
          
          lastUpdateRef.current = now;
        }
      } catch (error) {
        console.error('Real-time polling error:', error);
      }
    };

    // Start polling every 5 seconds
    intervalRef.current = setInterval(pollForUpdates, 5000);

    // Initial poll
    pollForUpdates();

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [queryClient]);

  return {
    lastUpdate: lastUpdateRef.current,
    isPolling: !!intervalRef.current
  };
}

function detectChanges(oldBoards: any[], newBoards: any[]) {
  const changes: Array<{
    type: 'created' | 'updated' | 'deleted';
    board: any;
    field?: string;
  }> = [];

  // Check for new boards
  newBoards.forEach(newBoard => {
    const oldBoard = oldBoards.find(b => b.id === newBoard.id);
    if (!oldBoard) {
      changes.push({ type: 'created', board: newBoard });
    } else {
      // Check for updates
      if (oldBoard.name !== newBoard.name) {
        changes.push({ type: 'updated', board: newBoard, field: 'name' });
      }
      if (oldBoard.goal !== newBoard.goal) {
        changes.push({ type: 'updated', board: newBoard, field: 'goal' });
      }
      if (oldBoard.updated_at !== newBoard.updated_at) {
        changes.push({ type: 'updated', board: newBoard, field: 'content' });
      }
    }
  });

  // Check for deleted boards
  oldBoards.forEach(oldBoard => {
    const exists = newBoards.find(b => b.id === oldBoard.id);
    if (!exists) {
      changes.push({ type: 'deleted', board: oldBoard });
    }
  });

  return changes;
}