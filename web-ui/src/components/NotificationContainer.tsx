import { useState, useCallback } from 'react';
import Notification, { NotificationType } from './Notification';

interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  description?: string;
}

export default function NotificationContainer() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = useCallback(
    (type: NotificationType, message: string, description?: string) => {
      const id = Date.now().toString();
      setNotifications(prev => [...prev, { id, type, message, description }]);
      return id;
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Expose methods to add success and error notifications
  const showSuccess = useCallback(
    (message: string, description?: string) => {
      return addNotification('success', message, description);
    },
    [addNotification]
  );

  const showError = useCallback(
    (message: string, description?: string) => {
      return addNotification('error', message, description);
    },
    [addNotification]
  );

  // Expose the notification methods globally
  if (typeof window !== 'undefined') {
    (window as any).notifications = {
      success: showSuccess,
      error: showError,
      remove: removeNotification,
    };
  }

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-50"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            type={notification.type}
            message={notification.message}
            description={notification.description}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </div>
  );
}

// Create a hook to use notifications
export function useNotifications() {
  return {
    success: (message: string, description?: string) => {
      if (typeof window !== 'undefined' && (window as any).notifications) {
        return (window as any).notifications.success(message, description);
      }
    },
    error: (message: string, description?: string) => {
      if (typeof window !== 'undefined' && (window as any).notifications) {
        return (window as any).notifications.error(message, description);
      }
    },
    remove: (id: string) => {
      if (typeof window !== 'undefined' && (window as any).notifications) {
        return (window as any).notifications.remove(id);
      }
    },
  };
}
