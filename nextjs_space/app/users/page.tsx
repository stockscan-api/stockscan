'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { SelectInput } from '@/components/ui/select-input';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Plus, Edit, Trash2, User, Shield, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: 'STAFF' | 'MANAGER' | 'OWNER';
  isActive: boolean;
  createdAt: string;
}

interface FormData {
  email: string;
  name: string;
  password: string;
  role: 'STAFF' | 'MANAGER' | 'OWNER';
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    email: '',
    name: '',
    password: '',
    role: 'STAFF',
  });

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getUsers({ page, limit: 10 });
      setUsers(response?.data || response || []);
      setTotalPages(response?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenModal = (user?: UserData) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user?.email || '',
        name: user?.name || '',
        password: '',
        role: user?.role || 'STAFF',
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        name: '',
        password: '',
        role: 'STAFF',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingUser) {
        const payload: any = {
          name: formData.name,
          role: formData.role,
        };
        if (formData.password) {
          payload.password = formData.password;
        }
        await apiClient.updateUser(editingUser.id, payload);
        toast.success('User updated successfully');
      } else {
        await apiClient.createUser({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
        });
        toast.success('User created successfully');
      }

      setIsModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);

    try {
      await apiClient.deleteUser(userToDelete.id);
      toast.success('User deleted successfully');
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserStatus = async (user: UserData) => {
    try {
      await apiClient.updateUser(user.id, { isActive: !user.isActive });
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update user status');
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
            <Button variant="ghost" size="icon" onClick={() => handleOpenModal(user)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleUserStatus(user)}
              disabled={isCurrentUser}
            >
              {user?.isActive ? 'Deactivate' : 'Activate'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setUserToDelete(user);
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
            <p className="text-gray-500">Manage system users and their permissions</p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
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
                <span className="text-sm text-gray-500">+ Suppliers, reorder management</span>
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
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              isLoading={isLoading}
              emptyMessage="No users found"
            />
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit User' : 'Add New User'}
        className="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={!!editingUser}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {editingUser ? '(leave blank to keep current)' : '*'}
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <SelectInput
              options={[
                { value: 'STAFF', label: 'Staff - Basic access' },
                { value: 'MANAGER', label: 'Manager - Extended access' },
                { value: 'OWNER', label: 'Owner - Full access' },
              ]}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : editingUser ? (
                'Update User'
              ) : (
                'Create User'
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
          setUserToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${userToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isSubmitting}
      />
    </DashboardLayout>
  );
}
