import { login } from './actions'
import Image from 'next/image'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const error = (await searchParams).error

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500 to-red-800 p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-white/10 blur-[100px] mix-blend-multiply" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-orange-500/10 blur-[100px] mix-blend-multiply" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-2xl rounded-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex justify-center mb-3">
              <Image 
                src="/logo.png" 
                alt="Tycoon Oil and Gas Logo" 
                width={360} 
                height={360} 
                priority
                className="object-contain drop-shadow-md w-56 h-auto"
              />
            </div>
            
            <h1 className="text-2xl font-semibold text-center text-gray-900 mb-1">
              Tycoon Operations
            </h1>
            <p className="text-center text-gray-700 mb-4 text-sm font-medium">
              Sign in to TAPP to manage your station
            </p>

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@tycoongroup.com"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/40 text-gray-900 placeholder-gray-700 focus:bg-white/60 focus:ring-2 focus:ring-tycoon-red/20 focus:border-tycoon-red transition-colors outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/40 text-gray-900 placeholder-gray-700 focus:bg-white/60 focus:ring-2 focus:ring-tycoon-red/20 focus:border-tycoon-red transition-colors outline-none"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2 border border-red-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                formAction={login}
                className="w-full bg-tycoon-red hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors active:scale-[0.98] mt-2 shadow-md"
              >
                Sign In
              </button>
            </form>
          </div>
          <div className="px-8 py-4 bg-white/30 border-t border-white/20 flex justify-center backdrop-blur-md">
             <span className="text-xs text-gray-800 font-bold">Internal System • Tycoon Oil & Gas</span>
          </div>
        </div>
      </div>
    </div>
  )
}
