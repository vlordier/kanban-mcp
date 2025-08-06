import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimation,
} from '@dnd-kit/core';
import { TaskSummary, ColumnWithTasks } from '../types';

interface DragAndDropContextType {
  isDragging: boolean;
}

const DragAndDropContext = createContext<DragAndDropContextType | undefined>(undefined);

// Define the props for our provider component
interface DragAndDropProviderProps {
  children: ReactNode;
  onMoveTask?: (
    taskId: string,
    sourceColumnId: string,
    destinationColumnId: string
  ) => Promise<void>;
}

export function DragAndDropProvider({ children, onMoveTask }: DragAndDropProviderProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Configure sensors for drag detection with enhanced touch support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activation
      },
    })
  );

  // Memoized handler for when a drag operation starts
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  // Memoized handler for when a drag operation ends
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || !active.data.current) {
        setIsDragging(false);
        return;
      }

      const task = active.data.current.task as TaskSummary;
      const sourceColumn = active.data.current.sourceColumn as ColumnWithTasks;
      const destinationColumnId = over.id as string;

      // If the task was dropped in a different column
      if (destinationColumnId !== sourceColumn.id) {
        if (onMoveTask) {
          onMoveTask(task.id, sourceColumn.id, destinationColumnId).catch(error => {
            console.error('Failed to move task:', error);
          });
        }
      }

      setIsDragging(false);
    },
    [onMoveTask]
  );

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo<DragAndDropContextType>(
    () => ({
      isDragging,
    }),
    [isDragging]
  );

  // Custom drop animation
  const dropAnimation = useMemo(
    () => ({
      ...defaultDropAnimation,
      dragSourceOpacity: 0.5,
    }),
    []
  );

  return (
    <DragAndDropContext.Provider value={contextValue}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {children}

        {/* Overlay that follows the cursor when dragging */}
        <DragOverlay dropAnimation={dropAnimation}>
          {/* The DragOverlay will automatically render the dragged element */}
        </DragOverlay>
      </DndContext>
    </DragAndDropContext.Provider>
  );
}

// Custom hook to use the drag and drop context
export function useDragAndDrop() {
  const context = useContext(DragAndDropContext);
  if (context === undefined) {
    throw new Error('useDragAndDrop must be used within a DragAndDropProvider');
  }
  return context;
}
