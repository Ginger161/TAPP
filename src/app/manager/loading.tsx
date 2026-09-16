export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 lg:p-8 animate-pulse">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 h-64 border border-gray-100 dark:border-gray-800"></div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 h-64 border border-gray-100 dark:border-gray-800"></div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 h-96 border border-gray-100 dark:border-gray-800"></div>
      </div>
    </div>
  )
}
