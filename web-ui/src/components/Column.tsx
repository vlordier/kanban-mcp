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
      column,
    },
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
    } else if (
      columnName.includes('progress') ||
      columnName.includes('doing') ||
      columnName.includes('development')
    ) {
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
      className={`flex flex-col bg-white border border-gray-200 rounded shadow-sm min-w-[200px] ${isDragging ? dropIndicatorStyle : ''}`}
    >
      <div
        className={`flex justify-between items-center px-1.5 py-1 rounded-t border-b border-l-2 ${getColumnHeaderColor()}`}
      >
        <div className="flex items-center space-x-1 flex-1">
          <h3 className="text-xs font-medium">{column.name}</h3>
          {onCreateTaskClick && (
            <button
              onClick={() => onCreateTaskClick(column.id)}
              className="inline-flex items-center p-0.5 rounded text-gray-500 hover:text-blue-600 hover:bg-white/70 focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Add new task"
            >
              <PlusIcon className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
        <span
          className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-medium ${
            isAtCapacity
              ? 'bg-red-100 text-red-700'
              : isNearCapacity
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-700'
          }`}
          style={{ fontSize: '9px' }}
        >
          {tasks.length}
        </span>
      </div>
      <div className="overflow-visible flex-1 p-1.5">
        {tasks.length === 0 ? (
          <div
            className={`p-2 text-center border border-dashed rounded transition-all duration-200 ${
              isOver
                ? 'bg-blue-50 border-blue-300 text-blue-600'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}
            style={{ fontSize: '9px' }}
          >
            {isOver ? (
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mb-1">
                  <svg
                    className="w-3 h-3 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <span className="font-medium">Drop task here</span>
                <span className="text-xs text-blue-500 mt-0.5">Release to add to {column.name}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {/* Contextual icon based on column type */}
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-1">
                  {column.isLanding ? (
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ) : column.name.toLowerCase().includes('todo') || column.name.toLowerCase().includes('backlog') ? (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  ) : column.name.toLowerCase().includes('progress') || column.name.toLowerCase().includes('doing') ? (
                    <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : column.name.toLowerCase().includes('review') || column.name.toLowerCase().includes('testing') ? (
                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : column.name.toLowerCase().includes('done') || column.name.toLowerCase().includes('complete') ? (
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  )}
                </div>
                
                {/* Contextual title and description */}
                <span className="font-medium text-gray-700 mb-0.5">
                  {column.isLanding ? 'Capture new ideas' :
                   column.name.toLowerCase().includes('todo') || column.name.toLowerCase().includes('backlog') ? 'Plan your work' :
                   column.name.toLowerCase().includes('progress') || column.name.toLowerCase().includes('doing') ? 'Start working' :
                   column.name.toLowerCase().includes('review') || column.name.toLowerCase().includes('testing') ? 'Quality check' :
                   column.name.toLowerCase().includes('done') || column.name.toLowerCase().includes('complete') ? 'Celebrate completion' :
                   'Add your tasks'}
                </span>
                
                <span className="text-gray-500 mb-2 text-center leading-tight">
                  {column.isLanding ? 'This is where new tasks land. Create your first task or drag from other columns.' :
                   column.name.toLowerCase().includes('todo') || column.name.toLowerCase().includes('backlog') ? 'Break down your project into actionable tasks. Start with the most important ones.' :
                   column.name.toLowerCase().includes('progress') || column.name.toLowerCase().includes('doing') ? 'Move tasks here when you start working on them. Keep it focused!' :
                   column.name.toLowerCase().includes('review') || column.name.toLowerCase().includes('testing') ? 'Tasks ready for review or testing. Ensure quality before completion.' :
                   column.name.toLowerCase().includes('done') || column.name.toLowerCase().includes('complete') ? 'Completed tasks go here. Track your progress and accomplishments.' :
                   'Drag tasks here or create new ones to get started.'}
                </span>
                
                {onCreateTaskClick && (
                  <button
                    onClick={() => onCreateTaskClick(column.id)}
                    className="inline-flex items-center px-1.5 py-0.5 font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-200"
                    style={{ fontSize: '8px' }}
                  >
                    <PlusIcon className="w-2.5 h-2.5 mr-0.5" />
                    {column.isLanding ? 'Add first task' :
                     column.name.toLowerCase().includes('todo') || column.name.toLowerCase().includes('backlog') ? 'Plan a task' :
                     column.name.toLowerCase().includes('progress') || column.name.toLowerCase().includes('doing') ? 'Start new work' :
                     column.name.toLowerCase().includes('review') || column.name.toLowerCase().includes('testing') ? 'Add for review' :
                     column.name.toLowerCase().includes('done') || column.name.toLowerCase().includes('complete') ? 'Mark as done' :
                     'Create task'}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {tasks.map(task => (
              <li key={task.id} onClick={() => onTaskClick(task.id)}>
                <TaskCard task={task} column={column} isMoving={false} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
