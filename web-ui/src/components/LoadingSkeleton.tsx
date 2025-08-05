// LoadingSkeleton component for loading states

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />;
}

export function BoardDetailSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="mb-1">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-1" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <Skeleton className="h-3 w-48" />
          <div className="flex items-center space-x-1">
            <Skeleton className="h-2 w-12" />
            <Skeleton className="h-2 w-1" />
            <Skeleton className="h-2 w-8" />
          </div>
        </div>
      </div>

      {/* Columns skeleton */}
      <div className="flex gap-1.5 min-w-max">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-[200px] space-y-2">
            {/* Column header */}
            <div className="flex justify-between items-center px-1.5 py-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            
            {/* Task cards */}
            <div className="space-y-2 px-1.5">
              {[1, 2, i === 1 ? 3 : 0].filter(Boolean).map(j => (
                <div key={j} className="bg-white dark:bg-gray-800 rounded p-1.5 border-l-2 border-gray-200">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <div className="flex justify-between items-center mt-2">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BoardListSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48 mt-1" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-7 w-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Search skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="mb-4">
          <Skeleton className="h-10 w-80 rounded-lg" />
        </div>

        {/* Board cards skeleton */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    
                    {/* Progress indicators */}
                    <div className="flex items-center space-x-4 mt-4">
                      <div className="flex items-center space-x-1">
                        <Skeleton className="h-3 w-3 rounded-full" />
                        <Skeleton className="h-3 w-8" />
                      </div>
                      <div className="flex items-center space-x-1">
                        <Skeleton className="h-3 w-3 rounded-full" />
                        <Skeleton className="h-3 w-8" />
                      </div>
                      <div className="flex items-center space-x-1">
                        <Skeleton className="h-3 w-3 rounded-full" />
                        <Skeleton className="h-3 w-8" />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskDetailSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

export default Skeleton;