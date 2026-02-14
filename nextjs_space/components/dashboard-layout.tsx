'use client';

import { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { ProtectedRoute } from './protected-route';
import { UserRole } from '@/lib/types';

interface DashboardLayoutProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function DashboardLayout({ children, allowedRoles }: DashboardLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <main className="lg:ml-64 min-h-screen">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
