// src/hooks/useNavigationGuard.ts
import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface NavigationGuardOptions {
  enabled?: boolean;
  message?: string;
  onBeforeUnload?: () => boolean;
}

export function useNavigationGuard(
  hasUnsavedChanges: boolean,
  options: NavigationGuardOptions = {}
) {
  const {
    enabled = true,
    message = 'You have unsaved changes. Are you sure you want to leave?',
    onBeforeUnload
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const lastPathname = useRef(pathname);
  const isNavigating = useRef(false);

  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) return;

    // Browser back/forward/refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (onBeforeUnload && !onBeforeUnload()) {
        return;
      }
      
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, hasUnsavedChanges, message, onBeforeUnload]);

  // Handle Next.js navigation
  useEffect(() => {
    if (pathname !== lastPathname.current) {
      lastPathname.current = pathname;
      isNavigating.current = false;
    }
  }, [pathname]);

  const guardedPush = (url: string) => {
    if (!enabled || !hasUnsavedChanges || isNavigating.current) {
      router.push(url);
      return;
    }

    if (window.confirm(message)) {
      isNavigating.current = true;
      router.push(url);
    }
  };

  return { guardedPush };
}