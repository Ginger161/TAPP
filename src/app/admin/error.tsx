'use client'

import { AlertOctagon, RefreshCcw } from 'lucide-react'
import { useEffect } from 'react'

export default function AdminErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertOctagon className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Admin Error</h2>
        <p className="text-slate-500 dark:text-gray-400 mb-8">
          We encountered an unexpected error in the admin portal. Please try again.
        </p>
        <button
          onClick={() => reset()}
          className="w-full flex items-center justify-center gap-2 bg-tycoon-red hover:bg-red-800 text-white font-bold py-3 rounded-lg shadow-sm transition-colors"
        >
          <RefreshCcw className="w-5 h-5" />
          Try Again
        </button>
      </div>
    </div>
  )
}
