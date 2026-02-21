'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { SelectInput } from '@/components/ui/select-input';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Edit, Trash2, User, Shield, Loader2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: 'STAFF' | 'MANAGER' | 'OWNER';
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [newRole, setNewRole] = useState<string>('STAFF');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getUsers();
      setUsers(Array.isArray(response) ? response : response?.data || response?.users || []);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenRoleModal = (user: UserData) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setIsRoleModalOpen(true);
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);

    try {
      await apiClient.updateUserRole(selectedUser.id, newRole);
      toast.success('User role updated successfully');
      setIsRoleModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update user role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);

    try {
      await apiClient.deleteUser(selectedUser.id);
      toast.success('User deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'danger';
      case 'MANAGER':
        return 'warning';
      default:
        return 'info';
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'User',
      render: (user: UserData) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: UserData) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-400" />
          <Badge variant={getRoleBadgeVariant(user?.role)}>
            {user?.role}
          </Badge>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user: UserData) => (
        <Badge variant={user?.isActive ? 'success' : 'default'}>
          {user?.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (user: UserData) => (
        <span className="text-gray-500 text-sm">
          {user?.createdAt ? new Date(user.createdAt)?.toLocaleDateString?.() : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user: UserData) => {
        const isCurrentUser = user?.id === currentUser?.id;
        return (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleOpenRoleModal(user)}
              disabled={isCurrentUser}
            >
              <Edit className="h-4 w-4 mr-1" /> Role
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedUser(user);
                setIsDeleteDialogOpen(true);
              }}
              disabled={isCurrentUser}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout allowedRoles={['OWNER']}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500">Manage team members and their roles</p>
          </div>
          <Link href="/invitations">
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </Link>
        </div>

        {/* Role Legend */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Role Permissions:</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="info">STAFF</Badge>
                <span className="text-sm text-gray-500">View products, adjust stock, transactions</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="warning">MANAGER</Badge>
                <span className="text-sm text-gray-500">+ Suppliers, reorder, import, invitations</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="danger">OWNER</Badge>
                <span className="text-sm text-gray-500">Full access including user management</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <DataTable
              data={users}
              columns={columns}
              keyExtractor={(item) => item?.id}
              isLoading={isLoading}
              emptyMessage="No users found. Invite team members using the Invitations page."
            />
          </CardContent>
        </Card>
      </div>

      {/* Change Role Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Change User Role"
        className="max-w-md"
      >
        <form onSubmit={handleUpdateRole} className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Change role for <strong>{selectedUser?.name}</strong> ({selectedUser?.email})
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Role *</label>
            <SelectInput
              options={[
                { value: 'STAFF', label: 'Staff - Basic access' },
                { value: 'MANAGER', label: 'Manager - Extended access' },
                { value: 'OWNER', label: 'Owner - Full access' },
              ]}
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Update Role'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${selectedUser?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isSubmitting}
      />
    </DashboardLayout>
  );
}
