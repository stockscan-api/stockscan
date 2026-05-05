'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import {
  Smartphone,
  Download,
  QrCode,
  Package,
  ClipboardList,
  Users,
  Shield,
  Scan,
  RefreshCw,
  CheckCircle2,
  Star,
  Apple,
  Play,
  Layers,
  Zap,
  Lock,
  Wifi
} from 'lucide-react';

export default function MobileAppPage() {
  const { user } = useAuth();

  const features = [
    {
      icon: Scan,
      title: 'Barcode Scanning',
      description: 'Quickly scan barcodes and QR codes to allocate or return stock. Supports multiple formats including EAN13, Code128, and more.'
    },
    {
      icon: ClipboardList,
      title: 'Job Cards',
      description: 'Create, assign, and track job cards on the go. Manage priorities, assign team members, and complete jobs from anywhere.'
    },
    {
      icon: Package,
      title: 'Stock Management',
      description: 'View and manage your entire inventory. Add new stock items, update quantities, and track locations in real-time.'
    },
    {
      icon: RefreshCw,
      title: 'Stock Allocation',
      description: 'Allocate stock to jobs and process returns seamlessly. Automatic inventory updates ensure accurate stock levels.'
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Invite team members, assign roles, and manage user permissions. Works with OWNER, MANAGER, and STAFF roles.'
    },
    {
      icon: Shield,
      title: 'Admin Panel',
      description: 'Super Admin access to generate product codes, view platform statistics, and manage all companies from your mobile device.'
    }
  ];

  const changelog = [
    {
      version: 'v1.14.0',
      date: 'May 5, 2026',
      changes: [
        'Added "Forgot Password?" option on the login screen',
        'Users receive a 6-digit reset code via email',
        'New Reset Password screen to enter code and set a new password',
        'Codes expire after 30 minutes for security'
      ]
    },
    {
      version: 'v1.13.19',
      date: 'May 5, 2026',
      changes: [
        'Warning banner on Add Product screen can now be dismissed with an X button',
        'Dismiss choice persists across sessions'
      ]
    },
    {
      version: 'v1.13.18',
      date: 'May 5, 2026',
      changes: [
        'Added amber warning banner when adding a product with no default warehouse configured'
      ]
    },
    {
      version: 'v1.13.17',
      date: 'May 5, 2026',
      changes: [
        'Fixed clipped text on status chips (Pending, Completed, etc.) across multiple screens'
      ]
    },
    {
      version: 'v1.13.16',
      date: 'May 5, 2026',
      changes: [
        'Fixed 404 error when creating a new warehouse'
      ]
    },
    {
      version: 'v1.13.15',
      date: 'May 5, 2026',
      changes: [
        'Clearer error message when signing up with an already registered email'
      ]
    },
    {
      version: 'v1.13.14',
      date: 'May 4, 2026',
      changes: [
        'Fixed signup flow not accepting license keys from the admin panel'
      ]
    },
    {
      version: 'v1.13.13',
      date: 'May 2, 2026',
      changes: [
        'Code generation/deletion restricted to SUPER_ADMIN only'
      ]
    },
    {
      version: 'v1.13.12',
      date: 'May 2, 2026',
      changes: [
        'Both legacy product codes and new license keys now work for signup'
      ]
    },
    {
      version: 'v1.13.11',
      date: 'May 2, 2026',
      changes: [
        'Fixed server error when accessing product codes endpoints'
      ]
    },
    {
      version: 'v1.2.3',
      date: 'February 23, 2026',
      changes: [
        'Fixed Admin Panel Quick Actions layout',
        'Improved button visibility and responsiveness',
        'All 6 quick action buttons now visible and functional'
      ]
    },
    {
      version: 'v1.2.2',
      date: 'February 23, 2026',
      changes: [
        'Fixed product code generation validation',
        'Added proper DTO validation decorators',
        'Super Admin can now successfully generate product codes'
      ]
    },
    {
      version: 'v1.2.1',
      date: 'February 23, 2026',
      changes: [
        'Fixed iOS barcode scanner compatibility',
        'Migrated from expo-barcode-scanner to expo-camera',
        'Added support for multiple barcode formats'
      ]
    },
    {
      version: 'v1.2.0',
      date: 'February 23, 2026',
      changes: [
        'Production backend configuration',
        'Prepared for TestFlight deployment',
        'Updated environment variables for production'
      ]
    }
  ];

  const techStack = [
    { name: 'React Native', description: 'Cross-platform mobile framework' },
    { name: 'Expo SDK 52', description: 'Development and build tools' },
    { name: 'TypeScript', description: 'Type-safe development' },
    { name: 'React Native Paper', description: 'Material Design UI components' },
    { name: 'Expo Camera', description: 'Barcode scanning capabilities' },
    { name: 'Expo Secure Store', description: 'Secure token storage' }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Smartphone className="h-8 w-8 text-blue-600" />
              StockScan Mobile App
            </h1>
            <p className="text-gray-600 mt-1">Take your inventory management on the go with our mobile app</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              v1.14.0 — Password Reset
            </span>
          </div>
        </div>

        {/* Download Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 md:p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold mb-2">Download StockScan Mobile</h2>
              <p className="text-blue-100 mb-4">Available for iOS on the App Store. Seamlessly sync with your web dashboard.</p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://apps.apple.com/gb/app/stockscan-inventory-management/id6759203556"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white text-gray-900 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  <Apple className="h-5 w-5" />
                  Download on the App Store
                </a>
                <div
                  className="inline-flex items-center gap-2 bg-white/10 text-white/60 border border-white/20 px-5 py-2.5 rounded-lg font-medium cursor-default"
                >
                  <Play className="h-5 w-5" />
                  Android — Coming Soon
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center justify-center w-32 h-32 bg-white/10 rounded-2xl">
              <Smartphone className="h-16 w-16 text-white/80" />
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              );
            })}          </div>
        </div>

        {/* App Screens Overview */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-500" />
            App Navigation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">📊 Dashboard</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Quick stats overview</li>
                <li>• Recent activity</li>
                <li>• Quick action buttons</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">📦 Inventory</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Stock item list</li>
                <li>• Search & filter</li>
                <li>• Add/edit items</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">📋 Jobs</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Job cards list</li>
                <li>• Allocate stock (scan)</li>
                <li>• Return stock (scan)</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">⚙️ Settings</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• User profile</li>
                <li>• Team management</li>
                <li>• Admin panel</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Technical Stack */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Technical Stack
            </h2>
            <div className="space-y-3">
              {techStack.map((tech, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-gray-900">{tech.name}</span>
                    <span className="text-gray-500"> – {tech.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-500" />
              Security & Sync
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wifi className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Real-time Sync</h4>
                  <p className="text-sm text-gray-600">All data syncs instantly with the web dashboard via the same backend API.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lock className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">JWT Authentication</h4>
                  <p className="text-sm text-gray-600">Secure token-based authentication with 7-day expiry and secure storage.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Role-based Access</h4>
                  <p className="text-sm text-gray-600">Same permission model as web: SUPER_ADMIN, OWNER, MANAGER, STAFF.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Version History */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-500" />
            Version History
          </h2>
          <div className="space-y-4">
            {changelog.map((release, index) => (
              <div key={index} className={`border-l-2 pl-4 ${index === 0 ? 'border-green-500' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-semibold ${index === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    {release.version}
                  </span>
                  {index === 0 && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Latest</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-2">{release.date}</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {release.changes.map((change, i) => (
                    <li key={i}>• {change}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* API Documentation Link */}
        <div className="bg-slate-900 rounded-xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">API Documentation</h3>
              <p className="text-slate-400 text-sm">
                The mobile app uses the same RESTful API as this web dashboard. Full documentation available at the API docs portal.
              </p>
            </div>
            <a
              href="https://api.stockscan.uk/api-docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              View API Docs
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
