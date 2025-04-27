import { ColumnWithTasks } from '../types';
import TaskCard from './TaskCard';
import { useDroppable } from '@dnd-kit/core';
import { useDragAndDrop } from '../contexts/DragAndDropContext';

interface ColumnProps {
  column: ColumnWithTasks;
  onTaskClick: (taskId: string) => void;
}

export default function Column({ column, onTaskClick }: ColumnProps) {
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
  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col border-b border-gray-900/5 bg-gray-50 rounded-md shadow p-2 min-w-[250px] transition-colors ${isDragging ? dropIndicatorStyle : ''}`}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-900">{column.name}</h3>
        <div className="flex items-center">
          <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-800">
            {column.tasks.length} {column.wipLimit > 0 ? `/ ${column.wipLimit}` : ''}
          </span>
          {column.isLanding && (
            <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
              Landing
            </span>
          )}
        </div>
      </div>
      <div className="overflow-visible flex-1">
        {column.tasks.length === 0 ? (
          <div className={`p-4 text-center text-sm text-gray-500 ${isOver ? 'bg-indigo-100 rounded-md' : ''}`}>
            {isOver ? 'Drop here' : 'No tasks'}
          </div>
        ) : (
          <ul className="space-y-2">
            {column.tasks.map((task) => (
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
