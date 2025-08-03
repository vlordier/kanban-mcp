import { useCallback } from 'react';
import { useNotifications } from '../components/NotificationContainer';

interface ApiError {
  message: string;
  status: number;
  errorId?: string;
  details?: Array<{ path: string; message: string; code: string }>;
}

export function useApiError() {
  const notifications = useNotifications();

  const handleApiError = useCallback((error: unknown, fallbackMessage = 'An error occurred') => {
    if (error instanceof Error) {
      const apiError = error as ApiError;
      
      if (apiError.details && apiError.details.length > 0) {
        // Show validation errors
        const validationMessage = apiError.details
          .map(detail => `${detail.path}: ${detail.message}`)
          .join(', ');
        notifications.error('Validation Error', validationMessage);
      } else if (apiError.status === 429) {
        notifications.error('Rate Limited', 'Too many requests. Please wait before trying again.');
      } else if (apiError.status >= 500) {
        notifications.error('Server Error', `${apiError.message}${apiError.errorId ? ` (ID: ${apiError.errorId})` : ''}`);
      } else {
        notifications.error('Error', apiError.message);
      }
    } else {
      notifications.error('Error', fallbackMessage);
    }
  }, [notifications]);

  return { handleApiError };
}