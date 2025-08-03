import { useMutation, useQueryClient } from '@tanstack/react-query';
import { exportDatabase, importDatabase } from '../services/api';
import { useApiError } from './useApiError';
import { useNotifications } from '../components/NotificationContainer';
import { Board, Column, Task } from '../types';

export function useImportExport() {
  const queryClient = useQueryClient();
  const { handleApiError } = useApiError();
  const notifications = useNotifications();

  const exportMutation = useMutation({
    mutationFn: exportDatabase,
    onSuccess: async (blob) => {
      // Create download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kanban-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Show detailed success message with counts
      try {
        const text = await blob.text();
        const data = JSON.parse(text);
        const boardCount = data.boards?.length || 0;
        const columnCount = data.columns?.length || 0;
        const taskCount = data.tasks?.length || 0;
        
        notifications.success(
          `Database exported successfully! Exported ${boardCount} boards, ${columnCount} columns, and ${taskCount} tasks.`
        );
      } catch {
        // Fallback to generic message if parsing fails
        notifications.success('Database exported successfully');
      }
    },
    onError: error => handleApiError(error, 'Failed to export database'),
  });

  const importMutation = useMutation({
    mutationFn: (data: { boards: Board[]; columns: Column[]; tasks: Task[] }) =>
      importDatabase(data),
    onSuccess: (response) => {
      // Refresh all data after successful import
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      // Use the detailed message from the API response
      notifications.success(response.message || 'Database imported successfully!');
    },
    onError: error => handleApiError(error, 'Failed to import database'),
  });

  const handleFileImport = async (
    file: File
  ): Promise<{ boards: Board[]; columns: Column[]; tasks: Task[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target?.result as string);

          // Basic validation
          if (!data.boards || !data.columns || !data.tasks) {
            throw new Error('Invalid file format. Must contain boards, columns, and tasks arrays.');
          }

          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  return {
    exportDatabase: exportMutation.mutate,
    importDatabase: importMutation.mutate,
    handleFileImport,
    isExporting: exportMutation.isPending,
    isImporting: importMutation.isPending,
  };
}
