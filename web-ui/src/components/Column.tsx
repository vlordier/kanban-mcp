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
      className={`flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm min-w-[300px] transition-all duration-200 hover:shadow-md ${isDragging ? dropIndicatorStyle : ''}`}
    >
      <div className={`flex justify-between items-center p-4 rounded-t-xl border-b border-l-4 ${getColumnHeaderColor()}`}>
        <div className="flex items-center space-x-3 flex-1">
          <h3 className="text-base font-bold">{column.name}</h3>
          {onCreateTaskClick && (
            <button
              onClick={() => onCreateTaskClick(column.id)}
              className="inline-flex items-center p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-colors duration-200"
              title="Add new task"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
            isAtCapacity ? 'bg-red-100 text-red-700 border border-red-200' : 
            isNearCapacity ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 
            'bg-gray-100 text-gray-700 border border-gray-200'
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
      <div className="overflow-visible flex-1 p-4">
        {tasks.length === 0 ? (
          <div className={`p-8 text-center text-sm border-2 border-dashed rounded-xl transition-all duration-200 ${
            isOver 
              ? 'bg-indigo-50 border-indigo-300 text-indigo-600' 
              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
          }`}>
            {isOver ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="font-medium">Drop task here</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <span className="font-medium text-gray-700 mb-2">No tasks yet</span>
                <span className="text-xs text-gray-500 mb-4">This column is ready for tasks</span>
                {onCreateTaskClick && (
                  <button
                    onClick={() => onCreateTaskClick(column.id)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-all duration-200"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
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