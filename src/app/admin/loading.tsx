export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 lg:p-8 animate-pulse">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
        </div>

        {/* Dashboard Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-6 h-32 border border-gray-100 dark:border-gray-800">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </div>
          ))}
        </div>

        {/* Table/List Skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 h-64">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
