import { login } from './actions'
import Image from 'next/image'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const error = (await searchParams).error

  return (
    <div className="min-h-screen flex items-center justify-center bg-tycoon-navy p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px] mix-blend-multiply" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-teal-500/10 blur-[100px] mix-blend-multiply" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-8">
            <div className="flex justify-center mb-8">
              <Image 
                src="/logo.png" 
                alt="Tycoon Oil and Gas Logo" 
                width={140} 
                height={140} 
                priority
                className="object-contain"
              />
            </div>
            
            <h1 className="text-2xl font-semibold text-center text-gray-900 dark:text-white mb-2">
              Tycoon Operations
            </h1>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-8 text-sm">
              Sign in to TAPP to manage your station
            </p>

            <form className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@tycoongroup.com"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors outline-none"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-sm flex items-center gap-2 border border-red-100 dark:border-red-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                formAction={login}
                className="w-full bg-tycoon-navy hover:bg-blue-900 text-white font-medium py-2.5 rounded-xl transition-colors active:scale-[0.98] mt-2"
              >
                Sign In
              </button>
            </form>
          </div>
          <div className="px-8 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-center">
             <span className="text-xs text-gray-400 font-medium">Internal System • Tycoon Oil & Gas</span>
          </div>
        </div>
      </div>
    </div>
  )
}
