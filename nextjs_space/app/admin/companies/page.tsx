'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { apiClient } from '@/lib/api-client';
import { Building2, Search, Eye, Ban, CheckCircle, Trash2, Loader2, Users, Package, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Company {
  id: string;
  name: string;
  email: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  subscriptionEndDate: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    users: number;
    products: number;
  };
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, [page, search, statusFilter]);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getCompanies({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setCompanies(res?.companies || []);
      setTotalPages(res?.totalPages || 1);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch companies');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (company: Company) => {
    try {
      const details = await apiClient.getCompany(company.id);
      setSelectedCompany(details);
      setShowDetailsModal(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch company details');
    }
  };

  const handleSuspend = async (company: Company) => {
    setActionLoading(company.id);
    try {
      await apiClient.suspendCompany(company.id);
      toast.success(`${company.name} has been suspended`);
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.message || 'Failed to suspend company');
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (company: Company) => {
    setActionLoading(company.id);
    try {
      await apiClient.activateCompany(company.id);
      toast.success(`${company.name} has been activated`);
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.message || 'Failed to activate company');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!companyToDelete) return;
    setActionLoading(companyToDelete.id);
    try {
      await apiClient.deleteCompany(companyToDelete.id);
      toast.success(`${companyToDelete.name} has been deleted`);
      setShowDeleteConfirm(false);
      setCompanyToDelete(null);
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete company');
    } finally {
      setActionLoading(null);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'ENTERPRISE': return 'bg-amber-100 text-amber-800';
      case 'PROFESSIONAL': return 'bg-purple-100 text-purple-800';
      case 'BASIC': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string, isActive: boolean) => {
    if (!isActive) return 'bg-red-100 text-red-800';
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'EXPIRED': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Companies
            </h1>
            <p className="text-gray-500">Manage all registered companies</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search companies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Companies Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No companies found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {companies.map((company) => (
                      <tr key={company.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{company.name}</p>
                            <p className="text-sm text-gray-500">{company.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getTierColor(company.subscriptionTier)}>
                            {company.subscriptionTier || 'FREE'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getStatusColor(company.subscriptionStatus, company.isActive)}>
                            {!company.isActive ? 'SUSPENDED' : company.subscriptionStatus || 'ACTIVE'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>{company._count?.users || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4 text-gray-400" />
                            <span>{company._count?.products || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {company.createdAt ? format(new Date(company.createdAt), 'MMM d, yyyy') : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleViewDetails(company)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {company.isActive ? (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleSuspend(company)}
                                disabled={actionLoading === company.id}
                                title="Suspend"
                                className="text-orange-600 hover:text-orange-700"
                              >
                                {actionLoading === company.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Ban className="h-4 w-4" />
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleActivate(company)}
                                disabled={actionLoading === company.id}
                                title="Activate"
                                className="text-green-600 hover:text-green-700"
                              >
                                {actionLoading === company.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setCompanyToDelete(company);
                                setShowDeleteConfirm(true);
                              }}
                              title="Delete"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

        {/* Company Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Company Details"
        >
          {selectedCompany && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Company Name</p>
                  <p className="font-medium">{selectedCompany.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{selectedCompany.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{selectedCompany.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">{selectedCompany.address || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Subscription Tier</p>
                  <Badge className={getTierColor(selectedCompany.subscriptionTier)}>
                    {selectedCompany.subscriptionTier || 'FREE'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={getStatusColor(selectedCompany.subscriptionStatus, selectedCompany.isActive)}>
                    {!selectedCompany.isActive ? 'SUSPENDED' : selectedCompany.subscriptionStatus || 'ACTIVE'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">License Key</p>
                  <p className="font-mono text-sm">{selectedCompany.activeLicenseKey || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Subscription Ends</p>
                  <p className="font-medium">
                    {selectedCompany.subscriptionEndDate
                      ? format(new Date(selectedCompany.subscriptionEndDate), 'MMM d, yyyy')
                      : '-'}
                  </p>
                </div>
              </div>

              {/* Users List */}
              {selectedCompany.users && selectedCompany.users.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Users ({selectedCompany.users.length})</h4>
                  <div className="space-y-2">
                    {selectedCompany.users.map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        <Badge variant="outline">{user.role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedCompany._count?.users || 0}</p>
                  <p className="text-sm text-gray-500">Users</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedCompany._count?.products || 0}</p>
                  <p className="text-sm text-gray-500">Products</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedCompany._count?.suppliers || 0}</p>
                  <p className="text-sm text-gray-500">Suppliers</p>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setCompanyToDelete(null);
          }}
          onConfirm={handleDelete}
          title="Delete Company"
          message={`Are you sure you want to delete "${companyToDelete?.name}"? This will permanently delete all users, products, and data. This action cannot be undone.`}
          confirmText="Delete Company"
          isLoading={actionLoading === companyToDelete?.id}
        />
      </div>
    </AdminLayout>
  );
}
