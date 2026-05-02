'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  LayoutDashboard,
  Package,
  Truck,
  ArrowLeftRight,
  ClipboardList,
  Users,
  LogOut,
  Menu,
  X,
  Upload,
  UserPlus,
  CreditCard,
  Settings,
  Shield,
  Smartphone,
  PackageCheck,
  BarChart3,
  ShoppingCart,
  Palette,
  FileText,
  Warehouse,
  ArrowRightLeft,
  ClipboardCheck,
  ShoppingBag,
  Building2,
  ScanLine,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

// v1.2.25: Navigation items with role-based access
// DELIVERY_CLERK only has access to Deliveries (create, collect, PDF export)
const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['STAFF', 'MANAGER', 'OWNER'] },
  { href: '/products', label: 'Products', icon: Package, roles: ['STAFF', 'MANAGER', 'OWNER'] },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight, roles: ['STAFF', 'MANAGER', 'OWNER'] },
  { href: '/job-cards', label: 'Job Cards', icon: ClipboardList, roles: ['STAFF', 'MANAGER', 'OWNER'] },
  { href: '/deliveries', label: 'Deliveries', icon: PackageCheck, roles: ['STAFF', 'MANAGER', 'OWNER', 'DELIVERY_CLERK'] },
  { href: '/pos', label: 'Point of Sale', icon: ShoppingCart, roles: ['STAFF', 'MANAGER', 'OWNER'] },
  { href: '/invoices', label: 'Invoices', icon: FileText, roles: ['STAFF', 'MANAGER', 'OWNER'] },
  { href: '/warehouses', label: 'Warehouses', icon: Warehouse, roles: ['MANAGER', 'OWNER'] },
  { href: '/stock-transfers', label: 'Stock Transfers', icon: ArrowRightLeft, roles: ['MANAGER', 'OWNER'] },
  { href: '/stocktakes', label: 'Stocktakes', icon: ClipboardCheck, roles: ['MANAGER', 'OWNER'] },
  { href: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingBag, roles: ['MANAGER', 'OWNER'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['MANAGER', 'OWNER'] },
  { href: '/barcode-scanner', label: 'Barcode Scanner', icon: ScanLine, roles: ['STAFF', 'MANAGER', 'OWNER'] },
  { href: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['MANAGER', 'OWNER'] },
  { href: '/import', label: 'Import', icon: Upload, roles: ['MANAGER', 'OWNER'] },
  { href: '/invitations', label: 'Invitations', icon: UserPlus, roles: ['MANAGER', 'OWNER'] },
  { href: '/users', label: 'Users', icon: Users, roles: ['OWNER'] },
  { href: '/subscription', label: 'Subscription', icon: CreditCard, roles: ['STAFF', 'MANAGER', 'OWNER'] },
  { href: '/mobile-app', label: 'Mobile App', icon: Smartphone, roles: ['STAFF', 'MANAGER', 'OWNER'] },
  { href: '/company-profile', label: 'Company Profile', icon: Building2, roles: ['MANAGER', 'OWNER'] },
  { href: '/branding', label: 'Branding', icon: Palette, roles: ['OWNER'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['STAFF', 'MANAGER', 'OWNER'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasRole, isSuperAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNavItems = navItems.filter(item => 
    hasRole(item.roles as any[])
  );

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

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
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-slate-900 text-white z-40 transform transition-transform duration-200 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-700">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image src="/logo.png" alt="StockScan" width={40} height={40} className="rounded-lg" />
              <span className="text-xl font-bold">StockScan</span>
            </Link>
          </div>

          {/* Navigation - scrollable */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Admin Panel Link (Super Admin Only) */}
          {isSuperAdmin && (
            <div className="px-4 pb-2">
              <Link
                href="/admin/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
              >
                <Shield className="h-5 w-5" />
                <span className="font-medium">Admin Panel</span>
              </Link>
            </div>
          )}

          {/* User info & Logout */}
          <div className="p-4 border-t border-slate-700">
            <div className="px-4 py-2 mb-2">
              <p className="text-sm text-slate-400">Logged in as</p>
              <p className="font-medium truncate">{user?.name || user?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-blue-600">
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>

          {/* Copyright */}
          <div className="px-4 pb-4 text-center">
            <p className="text-xs text-slate-500">© 2026 StockScan. All rights reserved.</p>
          </div>
        </div>
      </aside>
    </>
  );
}
