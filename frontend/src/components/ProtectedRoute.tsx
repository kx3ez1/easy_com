"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector } from "@/store/store";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      // Loop prevention check
      if (pathname !== "/login" && pathname !== "/signup" && pathname !== "/#") {
        router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`);
      }
    }
  }, [user, loading, pathname, router]);

  // Premium loading state matching EasyCom design guidelines
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-outline-variant border-t-primary-container"></div>
            <div className="absolute h-6 w-6 animate-ping rounded-full bg-primary-container/20"></div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant animate-pulse">
            Verifying Authentication...
          </p>
        </div>
      </div>
    );
  }

  // Only render children if user is authenticated
  if (user) {
    return <>{children}</>;
  }

  // Return null during redirect phase
  return null;
}
