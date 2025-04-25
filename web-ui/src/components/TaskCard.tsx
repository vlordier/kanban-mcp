import { TaskSummary } from '../types';

interface TaskCardProps {
  task: TaskSummary;
}

export default function TaskCard({ task }: TaskCardProps) {
  return (
    <div className="bg-white shadow rounded-md p-3 cursor-pointer hover:shadow-md transition-shadow">
      <h4 className="text-sm font-medium text-gray-900 truncate">{task.title}</h4>
      <div className="mt-2 flex justify-between items-center">
        <span className="text-xs text-gray-500">
          {new Date(task.updatedAt).toLocaleDateString()}
        </span>
        {task.updateReason && (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
            Updated
          </span>
        )}
      </div>
    </div>
  );
}