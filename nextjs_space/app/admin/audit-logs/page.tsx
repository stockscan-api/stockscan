'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { AUDIT_ACTIONS } from '@/lib/types';
import { ClipboardList, Loader2, Building2, User, Activity, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  company?: {
    id: string;
    name: string;
  };
}

interface Company {
  id: string;
  name: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  useEffect(() => {
    fetchLogs();
    fetchCompanies();
  }, [page, actionFilter, companyFilter]);

  const fetchCompanies = async () => {
    try {
      const res = await apiClient.getCompanies({ limit: 100 });
      setCompanies(res?.companies || []);
    } catch (error) {
      // Ignore error for companies filter
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getAuditLogs({
        page,
        limit,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        companyId: companyFilter !== 'all' ? companyFilter : undefined,
      });
      setLogs(res?.logs || []);
      setTotal(res?.total || 0);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('DELETED')) return 'bg-red-100 text-red-800';
    if (action.includes('SUSPENDED')) return 'bg-orange-100 text-orange-800';
    if (action.includes('CREATED') || action.includes('ACTIVATED')) return 'bg-green-100 text-green-800';
    if (action.includes('GENERATED')) return 'bg-purple-100 text-purple-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('COMPANY')) return Building2;
    if (action.includes('USER') || action.includes('ADMIN')) return User;
    return Activity;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Audit Logs
          </h1>
          <p className="text-gray-500">Platform-wide activity and changes</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">Filters:</span>
              </div>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="all">All Actions</option>
                {AUDIT_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {action.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <select
                value={companyFilter}
                onChange={(e) => {
                  setCompanyFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="all">All Companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <div className="ml-auto text-sm text-gray-500">
                {total} total logs
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No audit logs found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {logs.map((log) => {
                  const ActionIcon = getActionIcon(log.action);
                  return (
                    <div key={log.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <ActionIcon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getActionColor(log.action)}>
                              {log.action.replace(/_/g, ' ')}
                            </Badge>
                            {log.company && (
                              <Badge variant="outline" className="text-gray-600">
                                <Building2 className="h-3 w-3 mr-1" />
                                {log.company.name}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-2 text-gray-900">{log.details}</p>
                          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                            {log.user && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {log.user.name} ({log.user.email})
                              </span>
                            )}
                            <span>
                              {log.createdAt ? format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss') : '-'}
                            </span>
                          </div>
                          {log.ipAddress && (
                            <p className="mt-1 text-xs text-gray-400">
                              IP: {log.ipAddress}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
