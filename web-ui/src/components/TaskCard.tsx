import { TaskSummary, ColumnWithTasks } from '../types';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface TaskCardProps {
  task: TaskSummary;
  column: ColumnWithTasks;
  isMoving?: boolean;
}

export default function TaskCard({ task, column, isMoving = false }: TaskCardProps) {
  // Set up this task as a draggable item
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: {
      task,
      sourceColumn: column
    }
  });
  
  // Apply transform styles when dragging or moving
  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
    position: isDragging ? 'relative' as const : 'static' as const,
  } : {
    opacity: isDragging ? 0.5 : 1
  };
  
  return (
    <div 
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`bg-white shadow rounded-md p-3 cursor-pointer hover:shadow-md transition-all touch-manipulation ${
        isMoving ? 'ring-2 ring-indigo-500 animate-pulse' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      <h4 className="text-sm font-medium text-gray-900 truncate">{task.title}</h4>
      <div className="mt-2 flex justify-between items-center">
        <span className="text-xs text-gray-500">
          {new Date(task.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
