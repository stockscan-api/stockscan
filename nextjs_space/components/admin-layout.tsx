'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  LayoutDashboard,
  Building2,
  KeyRound,
  Users,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/companies', label: 'Companies', icon: Building2 },
  { href: '/admin/license-keys', label: 'License Keys', icon: KeyRound },
  { href: '/admin/super-admins', label: 'Super Admins', icon: Users },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: ClipboardList },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isSuperAdmin, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      router.push('/login');
    }
  }, [isLoading, isSuperAdmin, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (isLoading || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                <Image src="/logo.png" alt="StockScan" width={32} height={32} />
              </div>
              <div>
                <h1 className="text-xl font-bold">StockScan</h1>
                <span className="text-xs text-amber-400 font-semibold">ADMIN PORTAL</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                    isActive
                      ? 'bg-amber-500 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-slate-700">
            <div className="mb-4 px-4">
              <p className="text-sm text-slate-400">Logged in as</p>
              <p className="font-medium truncate">{user?.name}</p>
              <p className="text-xs text-amber-400">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-all"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen bg-gray-100">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </>
  );
}
