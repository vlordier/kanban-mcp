import { useMutation, useQueryClient } from '@tanstack/react-query';
import { exportDatabase, importDatabase, exportToFileSystem } from '../services/api';
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

  const fileSystemExportMutation = useMutation({
    mutationFn: (options: { includeMetadata?: boolean; separateFiles?: boolean }) => 
      exportToFileSystem(options),
    onSuccess: (response) => {
      if (response.success) {
        const { stats, files } = response;
        const fileCount = files?.length || 0;
        const statsText = stats ? 
          `${stats.boards} boards, ${stats.columns} columns, ${stats.tasks} tasks` : 
          'your data';
        
        notifications.success(
          `Successfully exported ${statsText} to ${fileCount} files at ${response.exportPath}`
        );
      } else {
        notifications.error(response.message || 'Export failed');
      }
    },
    onError: error => handleApiError(error, 'Failed to export to file system'),
  });

  const handleFileImport = async (
    file: File
  ): Promise<{ boards: Board[]; columns: Column[]; tasks: Task[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const rawData = e.target?.result as string;
          
          // Check for empty or invalid content
          if (!rawData || rawData.trim().length === 0) {
            throw new Error('File is empty or contains no data');
          }

          // Check for extremely large files (prevent memory issues)
          if (rawData.length > 50 * 1024 * 1024) { // 50MB limit
            throw new Error('File is too large (maximum 50MB allowed)');
          }

          const data = JSON.parse(rawData);

          // Enhanced validation - check that data is an object first
          if (typeof data !== 'object' || data === null) {
            throw new Error('Invalid file format: Expected JSON object');
          }

          // Validate required properties are arrays
          if (!Array.isArray(data.boards) || !Array.isArray(data.columns) || !Array.isArray(data.tasks)) {
            throw new Error('Invalid data format: boards, columns, and tasks must be arrays');
          }

          // Additional validation for data integrity
          if (data.boards.length > 0) {
            // Check that boards have required properties
            const invalidBoard = data.boards.find((board: any) => 
              typeof board !== 'object' || 
              typeof board.id !== 'string' || 
              typeof board.name !== 'string'
            );
            if (invalidBoard) {
              throw new Error('Invalid board data: Each board must have id and name properties');
            }
          }

          if (data.columns.length > 0) {
            // Check that columns have required properties
            const invalidColumn = data.columns.find((column: any) => 
              typeof column !== 'object' || 
              typeof column.id !== 'string' || 
              typeof column.board_id !== 'string' ||
              typeof column.name !== 'string'
            );
            if (invalidColumn) {
              throw new Error('Invalid column data: Each column must have id, board_id, and name properties');
            }
          }

          if (data.tasks.length > 0) {
            // Check that tasks have required properties
            const invalidTask = data.tasks.find((task: any) => 
              typeof task !== 'object' || 
              typeof task.id !== 'string' || 
              typeof task.column_id !== 'string' ||
              typeof task.title !== 'string'
            );
            if (invalidTask) {
              throw new Error('Invalid task data: Each task must have id, column_id, and title properties');
            }
          }

          resolve(data);
        } catch (error) {
          // Provide more specific error messages
          if (error instanceof SyntaxError) {
            reject(new Error('Invalid JSON format: File contains malformed JSON data'));
          } else if (error instanceof Error) {
            reject(error);
          } else {
            reject(new Error('Unknown error occurred while processing file'));
          }
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  return {
    exportDatabase: exportMutation.mutate,
    exportToFileSystem: fileSystemExportMutation.mutate,
    importDatabase: importMutation.mutate,
    handleFileImport,
    isExporting: exportMutation.isPending,
    isExportingToFileSystem: fileSystemExportMutation.isPending,
    isImporting: importMutation.isPending,
  };
}
