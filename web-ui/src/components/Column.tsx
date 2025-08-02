import { ColumnWithTasks } from '../types';
import TaskCard from './TaskCard';
import { useDroppable } from '@dnd-kit/core';
import { useDragAndDrop } from '../contexts/DragAndDropContext';
import { PlusIcon } from '@heroicons/react/24/outline';

interface ColumnProps {
  column: ColumnWithTasks;
  onTaskClick: (taskId: string) => void;
  onCreateTaskClick?: (columnId: string) => void;
}

export default function Column({ column, onTaskClick, onCreateTaskClick }: ColumnProps) {
  const { isDragging } = useDragAndDrop();
  
  // Set up this column as a droppable area
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      column
    }
  });
  
  // Apply styles when a task is being dragged over this column
  const dropIndicatorStyle = isOver ? 'border-2 border-dashed border-indigo-500 bg-indigo-50' : '';
  // Get column header color based on column type
  const getColumnHeaderColor = () => {
    if (column.isLanding) {
      return 'bg-blue-100 border-blue-200 text-blue-800';
    }
    
    const columnName = column.name.toLowerCase();
    if (columnName.includes('todo') || columnName.includes('backlog')) {
      return 'bg-gray-100 border-gray-200 text-gray-800';
    } else if (columnName.includes('progress') || columnName.includes('doing') || columnName.includes('development')) {
      return 'bg-yellow-100 border-yellow-200 text-yellow-800';
    } else if (columnName.includes('review') || columnName.includes('testing')) {
      return 'bg-orange-100 border-orange-200 text-orange-800';
    } else if (columnName.includes('done') || columnName.includes('complete')) {
      return 'bg-green-100 border-green-200 text-green-800';
    }
    
    return 'bg-gray-100 border-gray-200 text-gray-800';
  };

  // Safely handle tasks array (guard against null/undefined)
  const tasks = column.tasks || [];
  
  // Check if column is at or near capacity
  const isNearCapacity = column.wipLimit > 0 && tasks.length >= column.wipLimit * 0.8;
  const isAtCapacity = column.wipLimit > 0 && tasks.length >= column.wipLimit;

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col bg-white border rounded-lg shadow-sm min-w-[280px] transition-all ${isDragging ? dropIndicatorStyle : ''}`}
    >
      <div className={`flex justify-between items-center p-3 border-b border-t-4 rounded-t-lg ${getColumnHeaderColor()}`}>
        <div className="flex items-center space-x-2 flex-1">
          <h3 className="text-sm font-semibold">{column.name}</h3>
          {onCreateTaskClick && (
            <button
              onClick={() => onCreateTaskClick(column.id)}
              className="inline-flex items-center p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              title="Add new task"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
            isAtCapacity ? 'bg-red-100 text-red-700' : 
            isNearCapacity ? 'bg-yellow-100 text-yellow-700' : 
            'bg-white/80 text-gray-700'
          }`}>
            {tasks.length} {column.wipLimit > 0 ? `/ ${column.wipLimit}` : ''}
          </span>
          {column.isLanding && (
            <span className="inline-flex items-center rounded-full bg-blue-200 px-2 py-1 text-xs font-medium text-blue-800">
              Landing
            </span>
          )}
        </div>
      </div>
      <div className="overflow-visible flex-1 p-3">
        {tasks.length === 0 ? (
          <div className={`p-6 text-center text-sm text-gray-500 border-2 border-dashed border-gray-200 rounded-lg ${isOver ? 'bg-indigo-50 border-indigo-300 text-indigo-600' : ''}`}>
            {isOver ? (
              <div className="flex flex-col items-center">
                <span className="text-lg mb-1">✨</span>
                <span>Drop task here</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-2xl mb-2 opacity-50">📋</span>
                <span>No tasks yet</span>
                {onCreateTaskClick && (
                  <button
                    onClick={() => onCreateTaskClick(column.id)}
                    className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 underline"
                  >
                    Add the first task
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li key={task.id} onClick={() => onTaskClick(task.id)}>
                <TaskCard 
                  task={task} 
                  column={column} 
                  isMoving={false}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}