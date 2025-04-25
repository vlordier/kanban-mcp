import { ColumnWithTasks } from '../types';
import TaskCard from './TaskCard';

interface ColumnProps {
  column: ColumnWithTasks;
  onTaskClick: (taskId: string) => void;
}

export default function Column({ column, onTaskClick }: ColumnProps) {
  return (
    <div className="flex flex-col border-b border-gray-900/5 bg-gray-50 rounded-md shadow p-2 min-w-[250px]">
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
      <div className="overflow-y-auto flex-1">
        {column.tasks.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">No tasks</div>
        ) : (
          <ul className="space-y-2">
            {column.tasks.map((task) => (
              <li key={task.id} onClick={() => onTaskClick(task.id)}>
                <TaskCard task={task} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}