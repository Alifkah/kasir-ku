'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import { useStore } from '@/store/useStore';
import { useHasHydrated } from '@/lib/useHasHydrated';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, initializeData } = useStore();
  const hasHydrated = useHasHydrated();

  const isPublicPage = pathname === '/login' || pathname === '/register';

  // Load accessibility large text preference on mount
  useEffect(() => {
    const savedLargeText = localStorage.getItem('accessibility-large-text') === 'true';
    if (savedLargeText) {
      document.documentElement.classList.add('accessibility-large');
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    // If not logged in and not on a public page, redirect to /login
    if (!currentUser && !isPublicPage) {
      router.push('/login');
    } else if (currentUser && isPublicPage) {
      // If logged in and visiting a public page, redirect to appropriate start page
      if (currentUser.role === 'Owner') {
        router.push('/dashboard');
      } else {
        router.push('/pos');
      }
    } else if (currentUser) {
      // Sync Supabase data on application load
      initializeData();
    }
  }, [currentUser, isPublicPage, router, initializeData, hasHydrated]);

  const showContent = hasHydrated && (!!currentUser || isPublicPage);

  return (
    <div className={`flex h-screen overflow-hidden bg-background print:h-auto print:overflow-visible ${isPublicPage ? 'w-screen overflow-hidden' : ''}`}>
      {/* Sidebar - only show if logged in and not on public pages */}
      {!isPublicPage && currentUser && <Sidebar />}

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden print:overflow-visible">
        {/* TopNavbar - only show if logged in and not on public pages */}
        {!isPublicPage && currentUser && <TopNavbar />}
        
        <main className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible relative">
          {/* Protecting page view from flash before session checks resolve */}
          {!showContent && (
            <div className="absolute inset-0 flex items-center justify-center bg-background text-sm font-medium text-muted-foreground animate-pulse z-50">
              Memeriksa sesi KasirKu...
            </div>
          )}
          <div className={!showContent ? 'invisible' : ''}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
