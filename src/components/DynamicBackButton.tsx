'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export default function DynamicBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  // Do not show on root dashboards
  if (
    pathname === '/admin/dashboard' ||
    pathname === '/manager/dashboard' ||
    pathname === '/viewer/dashboard'
  ) {
    return null;
  }

  const handleBack = () => {
    if (window.history.length > 2) {
      router.back();
    } else {
      // Fallback
      if (pathname.startsWith('/admin')) {
        router.push('/admin/dashboard');
      } else if (pathname.startsWith('/manager')) {
        router.push('/manager/dashboard');
      } else if (pathname.startsWith('/viewer')) {
        router.push('/viewer/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  };

  return (
    <button
      onClick={handleBack}
      className="mr-2 p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
      aria-label="Go back"
      title="Go back"
    >
      <ChevronLeft size={24} />
    </button>
  );
}
