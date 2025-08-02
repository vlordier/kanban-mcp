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

  // Get status color based on column characteristics
  const getStatusColor = () => {
    if (column.isLanding) {
      return 'border-l-blue-400 bg-blue-50/30';
    }
    
    // Assume columns follow a typical kanban flow: todo -> in-progress -> done
    const columnName = column.name.toLowerCase();
    if (columnName.includes('todo') || columnName.includes('backlog')) {
      return 'border-l-gray-400 bg-gray-50/30';
    } else if (columnName.includes('progress') || columnName.includes('doing') || columnName.includes('development')) {
      return 'border-l-yellow-400 bg-yellow-50/30';
    } else if (columnName.includes('review') || columnName.includes('testing')) {
      return 'border-l-orange-400 bg-orange-50/30';
    } else if (columnName.includes('done') || columnName.includes('complete')) {
      return 'border-l-green-400 bg-green-50/30';
    }
    
    return 'border-l-gray-400 bg-gray-50/30';
  };

  // Calculate days since last update for urgency indication
  const daysSinceUpdate = Math.floor((Date.now() - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
  const isStale = daysSinceUpdate > 7;
  
  return (
    <div 
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`bg-white shadow-sm rounded-lg p-4 cursor-pointer hover:shadow-md transition-all touch-manipulation border-l-4 ${getStatusColor()} ${
        isMoving ? 'ring-2 ring-indigo-500 animate-pulse' : ''
      } ${isDragging ? 'opacity-50' : ''} ${isStale ? 'border-r-2 border-r-red-300' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900 leading-tight flex-1 pr-2">{task.title}</h4>
        {isStale && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
              Stale
            </span>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-600 font-medium">
          {column.name}
        </span>
        <div className="flex items-center space-x-2">
          <span>
            {new Date(task.updatedAt).toLocaleDateString()}
          </span>
          {task.updateReason && (
            <div className="w-2 h-2 bg-blue-400 rounded-full" title="Has update reason"></div>
          )}
        </div>
      </div>
    </div>
  );
}