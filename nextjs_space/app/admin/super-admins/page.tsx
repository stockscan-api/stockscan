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
import { useAuth } from '@/contexts/auth-context';
import { Users, Plus, UserCheck, UserX, Loader2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface SuperAdmin {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function SuperAdminsPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<SuperAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [adminToDeactivate, setAdminToDeactivate] = useState<SuperAdmin | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getSuperAdmins();
      setAdmins(res?.superAdmins || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch super admins');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (createForm.password !== createForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (createForm.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setCreating(true);
    try {
      await apiClient.createSuperAdmin({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
      });
      toast.success('Super admin created successfully');
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', password: '', confirmPassword: '' });
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create super admin');
    } finally {
      setCreating(false);
    }
  };

  const handleActivate = async (admin: SuperAdmin) => {
    setActionLoading(admin.id);
    try {
      await apiClient.activateSuperAdmin(admin.id);
      toast.success(`${admin.name} has been activated`);
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.message || 'Failed to activate super admin');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async () => {
    if (!adminToDeactivate) return;
    setActionLoading(adminToDeactivate.id);
    try {
      await apiClient.deactivateSuperAdmin(adminToDeactivate.id);
      toast.success(`${adminToDeactivate.name} has been deactivated`);
      setShowDeactivateConfirm(false);
      setAdminToDeactivate(null);
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate super admin');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6" />
              Super Admins
            </h1>
            <p className="text-gray-500">Manage platform administrators</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-amber-500 hover:bg-amber-600">
            <Plus className="h-4 w-4 mr-2" />
            Add Super Admin
          </Button>
        </div>

        {/* Admins List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : admins.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No super admins found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {admins.map((admin) => (
                  <div key={admin.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                        <Shield className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{admin.name}</p>
                          {admin.id === user?.id && (
                            <Badge className="bg-blue-100 text-blue-800">You</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                        <p className="text-xs text-gray-400">
                          Created {admin.createdAt ? format(new Date(admin.createdAt), 'MMM d, yyyy') : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {admin.id !== user?.id && (
                        <>
                          {admin.isActive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAdminToDeactivate(admin);
                                setShowDeactivateConfirm(true);
                              }}
                              disabled={actionLoading === admin.id}
                              className="text-red-600 hover:text-red-700"
                            >
                              {actionLoading === admin.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <><UserX className="h-4 w-4 mr-1" /> Deactivate</>
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleActivate(admin)}
                              disabled={actionLoading === admin.id}
                              className="text-green-600 hover:text-green-700"
                            >
                              {actionLoading === admin.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <><UserCheck className="h-4 w-4 mr-1" /> Activate</>
                              )}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Add Super Admin"
        >
          <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <Input
                placeholder="Full name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                type="email"
                placeholder="admin@stockscan.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <Input
                type="password"
                placeholder="Min. 8 characters"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <Input
                type="password"
                placeholder="Confirm password"
                value={createForm.confirmPassword}
                onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                required
              />
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Warning:</strong> Super admins have full access to all platform data and settings.
                Only create accounts for trusted team members.
              </p>
            </div>
            <Button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600"
              disabled={creating}
            >
              {creating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" /> Create Super Admin</>
              )}
            </Button>
          </form>
        </Modal>

        {/* Deactivate Confirmation */}
        <ConfirmDialog
          isOpen={showDeactivateConfirm}
          onClose={() => {
            setShowDeactivateConfirm(false);
            setAdminToDeactivate(null);
          }}
          onConfirm={handleDeactivate}
          title="Deactivate Super Admin"
          message={`Are you sure you want to deactivate "${adminToDeactivate?.name}"? They will no longer be able to access the admin panel.`}
          confirmText="Deactivate"
          isLoading={actionLoading === adminToDeactivate?.id}
        />
      </div>
    </AdminLayout>
  );
}
