'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { Building2, Users, TrendingUp, AlertTriangle, Loader2, KeyRound, Activity } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dashboardRes, logsRes] = await Promise.all([
        apiClient.getAdminDashboard(),
        apiClient.getAuditLogs({ limit: 10 }),
      ]);
      setStats(dashboardRes);
      setRecentLogs(logsRes?.logs || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">Platform-wide statistics and overview</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Companies</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.totalCompanies || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Companies</p>
                  <p className="text-3xl font-bold text-green-600">{stats?.activeCompanies || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-red-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Suspended Companies</p>
                  <p className="text-3xl font-bold text-red-600">{stats?.suspendedCompanies || 0}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="text-3xl font-bold text-purple-600">{stats?.totalUsers || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href="/admin/license-keys?action=generate"
                className="block w-full p-4 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <p className="font-medium text-amber-900">Generate License Keys</p>
                <p className="text-sm text-amber-700">Create new license keys for customers</p>
              </Link>
              <Link
                href="/admin/companies"
                className="block w-full p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <p className="font-medium text-blue-900">Manage Companies</p>
                <p className="text-sm text-blue-700">View and manage all registered companies</p>
              </Link>
              <Link
                href="/admin/super-admins"
                className="block w-full p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <p className="font-medium text-purple-900">Add Super Admin</p>
                <p className="text-sm text-purple-700">Create new administrator accounts</p>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {recentLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-2 h-2 mt-2 rounded-full bg-amber-500" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{log.action?.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-600 truncate">{log.details}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">{log.user?.email || 'System'}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {log.createdAt ? format(new Date(log.createdAt), 'MMM d, HH:mm') : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link
                href="/admin/audit-logs"
                className="block text-center mt-4 text-amber-600 hover:text-amber-700 font-medium"
              >
                View All Activity →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
